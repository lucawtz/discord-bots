# Coolify-Ablösung — Migrationsplan

Stand: 2026-09-13 · Status: **abgeschlossen** (Umschalten 2026-09-12, 22:57 UTC; Coolify am 2026-09-13 komplett gelöscht) · Entscheidung: Luca (Coolify komplett abschaffen, Server nur noch per Terminal)

> **Umsetzung 2026-09-13 — Abweichungen vom ursprünglichen Plan:**
> - **Images werden auf dem Server gebaut, nicht über GHCR.** Das Repo ist öffentlich, der Server klont ohne Token. GHCR hätte einen PAT bzw. das manuelle Freischalten der Paket-Sichtbarkeit gebraucht. Build aller 3 Images ≈ 3,5 min. Deploy: `scripts/deploy.sh <service>`.
> - **Alle Domains laufen über den Cloudflare-Proxy.** Caddy holt die Zertifikate per HTTP-01 durch Cloudflare, wie vorher Traefik; alle 3 kamen beim ersten Versuch. `www.bytebots.de` hat keinen DNS-Eintrag und steht deshalb nicht im Caddyfile.
> - **Kein Hetzner-Snapshot, keine Cloud-Firewall** (kein hcloud-Token vorhanden). Stattdessen gibt es Volume-Backups: Server `/root/backup-coolify-migration-2026-09-13/`, Mac `~/Documents/Luca_Wirtz/Backups/bytebots-2026-09-13/`. Seit dem Umschalten lauschen öffentlich nur noch 22/80/443.
> - `pot-provider` ist auf `1.3.1` gepinnt; `warp` bekam das Volume `warp-data`. Die Env-Dateien wurden aus den laufenden Coolify-Containern erzeugt (11 bzw. 13 Keys).
> - **Ergebnis:** alle Checks grün (Details im CHANGELOG 2026-09-13); belegter RAM 901 MiB statt ~1,2 GiB.
> - **Phase 2 erledigt am 2026-09-13**, auf Lucas Wunsch vorgezogen (nach ~12 h stabilem Betrieb):
>   - gelöscht: 11 Coolify- und Alt-Container, die Volumes `coolify-db`/`coolify-redis`, das Netz `coolify`, `/data/coolify`, ~8 GB Images, `COOLIFY_API_TOKEN` in der Root-`.env`
>   - Coolifys interner root-Schlüssel ist aus `authorized_keys` entfernt; es bleibt nur Lucas Mac-Schlüssel (Notfall: Hetzner-Konsole)
>   - vorher gesichert in `/root/backup-coolify-migration-2026-09-13/` (`data-coolify.tar.gz`, `coolify-db-volume.tar.gz`, `root-authorized_keys.before`)
>   - Disk danach: 11 GB belegt, 26 GB frei
>   - **Ein Rollback auf Coolify ist nicht mehr vorgesehen.**

Ziel: Bots, Website, WARP und POT-Provider laufen per `docker compose` direkt auf dem Hetzner-Server. Coolify (6 Container) fällt weg. Deploy, Logs und Env laufen per SSH.

---

## 1. Ist-Zustand (inventarisiert 2026-09-12)

**Server:** Ubuntu 26.04 LTS · 1 vCPU · 1,9 GB RAM · 38 GB Disk (38 % belegt) · Docker 29.6.1 · **keine Firewall aktiv** (`ufw inactive`)

**Öffentlich offene Ports:** 22 (SSH), 80/443 (Traefik), **8080** (Traefik-API/Dashboard), **8000** (Coolify-UI, unverschlüsseltes HTTP), **6001/6002** (Coolify-Realtime)

**Coolify selbst (fällt weg):**

| Container | RAM |
|---|---|
| `coolify` | 181 MiB |
| `coolify-realtime` | 40 MiB |
| `coolify-db` (Postgres) | 35 MiB |
| `coolify-proxy` (Traefik v3.6) | 27 MiB |
| `coolify-sentinel` | 12 MiB |
| `coolify-redis` | 6 MiB |
| **Summe** | **~300 MiB** (~16 % des RAM) |

**Anwendungen (bleiben):**

| App | Quelle | Port | Domain | Daten / Mounts | RAM |
|---|---|---|---|---|---|
| music-bot | `bots/music-bot/Dockerfile` | 3001 | beatbyte.bytebots.de | Volume `e9kxd4rv94k3vu3at3nw6o7u-music-data` → `/repo/bots/music-bot/data`; Bind-Mount `cookies.txt` aus `/data/coolify/applications/e9kxd4rv94k3vu3at3nw6o7u/repo/bots/music-bot/cookies.txt` | 131 MiB |
| soundboard-bot | `bots/soundboard-bot/Dockerfile` | 3002 | soundboard.bytebots.de | Volume `rhyrgoi2u2l1f0g7xyp6c0m7-soundboard-data` → `/repo/bots/soundboard-bot/data` | 58 MiB |
| website | `website/Dockerfile` | 3003 | bytebots.de, www.bytebots.de | — | 13 MiB |
| warp | `caomingjun/warp:latest` | 1080 | intern, Alias `warp` | — (Registrierung geht beim Neuanlegen verloren, unkritisch) | 91 MiB |
| pot-provider | `brainicism/bgutil-ytdlp-pot-provider:latest` (1.3.1, Image vom 2026-03-07) | 4416 | intern, Alias `pot-provider` | — | 111 MiB |

- Alle hängen im Docker-Netz `coolify`, `restart: unless-stopped`.
- warp braucht: `cap_add NET_ADMIN, MKNOD, AUDIT_WRITE`, sysctls `net.ipv6.conf.all.disable_ipv6=0` + `net.ipv4.conf.all.src_valid_mark=1`, `device-cgroup-rule "c 10:200 rwm"`.
- Keine Coolify-Datenbanken oder -Services. TLS über Traefik-ACME (`/data/coolify/proxy/acme.json`).

**Env-Keys** (Werte gibt die Coolify-API nie heraus; sie stehen im laufenden Container und in der Root-`.env`):

- music-bot (11): `DISCORD_TOKEN`, `CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `API_KEY`, `API_PORT`, `OAUTH_REDIRECT_URI`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `APP_URL`, `ALERT_WEBHOOK_URL`, `STATUS_CHANNEL_ID`
- soundboard-bot (13): `DISCORD_TOKEN`, `CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `API_KEY`, `WEB_PORT`, `WEB_URL`, `OAUTH_REDIRECT_URI`, `ALLOWED_ORIGINS`, `GUILD_ID`, `SESSION_SECRET`, `FREESOUND_API_KEY`, `ALERT_WEBHOOK_URL`, `STATUS_CHANNEL_ID`
- website: keine

**Code-Abhängigkeiten zu Coolify:** keine funktionalen, nur Kommentare. Die Code-Defaults `socks5://warp:1080` und `http://pot-provider:4416` funktionieren unverändert, wenn die compose-Services genauso heißen. Das Soundboard respektiert `X-Forwarded-Proto` (Secure-Cookies), und Caddy setzt diesen Header standardmäßig.

---

## 2. Zielbild

```
/opt/bytebots/                  (auf dem Server, root:root)
├── compose.yml
├── Caddyfile
├── env/music-bot.env           (chmod 600, NIE ins Repo)
├── env/soundboard-bot.env      (chmod 600)
└── secrets/cookies.txt         (beschreibbar, yt-dlp schreibt zurück)
```

| Thema | Heute (Coolify) | Neu |
|---|---|---|
| Reverse-Proxy/TLS | Traefik + ACME | **Caddy** (automatisches HTTPS, 6-Zeilen-Config, WebSockets ohne Extra-Config) |
| Builds | auf dem Server (1 vCPU / 1,9 GB, music-bot-Build ist schwer) | **GitHub Actions baut → GHCR**, Server macht nur `pull` *(Entscheidung 1)* |
| Deploy | Coolify-API / UI | `scripts/deploy.sh <service>` → per SSH `docker compose pull && up -d` |
| Env/Secrets | Coolify-DB | `env/*.env` auf dem Server (chmod 600); Master-Vorlage bleibt die Root-`.env` |
| Logs | Coolify-Log-Endpoint (**nur stdout**) | `docker compose logs -f <service>` (stdout **und** stderr) |
| Selbstheilung | keine (WARP war 24 Tage tot) | Healthchecks + `autoheal`-Container |
| Firewall | keine | **Hetzner Cloud Firewall**: nur 22/tcp, 80/tcp, 443/tcp+udp (Docker umgeht `ufw`, deshalb nicht ufw) |

### compose.yml (Entwurf)

```yaml
name: bytebots

x-logging: &logging
  driver: json-file
  options: { max-size: "10m", max-file: "3" }

services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    logging: *logging

  music-bot:
    image: ghcr.io/lucawtz/bytebots-music-bot:${MUSIC_TAG:-latest}
    restart: unless-stopped
    env_file: env/music-bot.env
    volumes:
      - music-data:/repo/bots/music-bot/data
      - ./secrets/cookies.txt:/repo/bots/music-bot/cookies.txt
    depends_on: [warp, pot-provider]
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 120s   # Entrypoint macht erst ein pip-Update von yt-dlp
    labels: [autoheal=true]
    logging: *logging

  soundboard-bot:
    image: ghcr.io/lucawtz/bytebots-soundboard-bot:${SOUNDBOARD_TAG:-latest}
    restart: unless-stopped
    env_file: env/soundboard-bot.env
    volumes:
      - soundboard-data:/repo/bots/soundboard-bot/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3002/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 60s
    labels: [autoheal=true]
    logging: *logging

  website:
    image: ghcr.io/lucawtz/bytebots-website:${WEBSITE_TAG:-latest}
    restart: unless-stopped
    logging: *logging

  warp:
    image: caomingjun/warp:latest
    restart: unless-stopped
    cap_add: [NET_ADMIN, MKNOD, AUDIT_WRITE]
    sysctls:
      net.ipv6.conf.all.disable_ipv6: 0
      net.ipv4.conf.all.src_valid_mark: 1
    device_cgroup_rules: ["c 10:200 rwm"]
    labels: [autoheal=true]   # Image hat eigenen Healthcheck
    logging: *logging

  pot-provider:
    image: brainicism/bgutil-ytdlp-pot-provider:latest   # besser auf die Plugin-Version pinnen
    restart: unless-stopped
    logging: *logging

  autoheal:
    image: willfarrell/autoheal:latest
    restart: unless-stopped
    environment: { AUTOHEAL_CONTAINER_LABEL: autoheal }
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    logging: *logging

volumes:
  music-data:      { external: true, name: e9kxd4rv94k3vu3at3nw6o7u-music-data }
  soundboard-data: { external: true, name: rhyrgoi2u2l1f0g7xyp6c0m7-soundboard-data }
  caddy-data:
  caddy-config:
```

Die bestehenden Named Volumes werden als `external` **weiterverwendet**. Es werden keine Daten kopiert, und der Rollback bleibt trivial.

### Caddyfile

```
beatbyte.bytebots.de {
    reverse_proxy music-bot:3001
}
soundboard.bytebots.de {
    reverse_proxy soundboard-bot:3002
}
bytebots.de, www.bytebots.de {
    reverse_proxy website:3003
}
```

---

## 3. Ablauf

### Phase 0 — Vorbereitung (Prod läuft unverändert weiter)

1. **Hetzner-Snapshot** des Servers als Rollback-Netz.
2. **Backup der Daten:** beide Volumes per `tar` sichern und eine Kopie lokal ablegen (SQLite-DBs inkl. Soundboard-BLOBs).
3. **RAM-/Playback-Baseline** notieren (`docker stats --no-stream`).
4. **CI erweitern:** neuer Job `images` in `.github/workflows/ci.yml` (nach `lint-and-build`, nur bei Push auf den Deploy-Branch). Er baut die 3 Dockerfiles (Kontext = Repo-Root) mit `docker/build-push-action` und pusht nach GHCR mit den Tags `latest` + Commit-SHA.
5. **Server vorbereiten:** `/opt/bytebots` anlegen, `compose.yml` + `Caddyfile` ablegen, `docker login ghcr.io` mit einem **read-only PAT** (`read:packages`).
6. **Env-Dateien aus den laufenden Containern erzeugen**, ohne Werte auszugeben:
   ```sh
   docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' <music-container> \
     | grep -E '^(DISCORD_TOKEN|CLIENT_ID|DISCORD_CLIENT_SECRET|API_KEY|API_PORT|OAUTH_REDIRECT_URI|ALLOWED_ORIGINS|FRONTEND_URL|APP_URL|ALERT_WEBHOOK_URL|STATUS_CHANNEL_ID)=' \
     > /opt/bytebots/env/music-bot.env && chmod 600 /opt/bytebots/env/music-bot.env
   wc -l /opt/bytebots/env/music-bot.env   # erwartet: 11
   ```
   Analog für das Soundboard (13 Keys). Danach prüfen, dass kein Wert ` #` enthält (compose würde das als Kommentar lesen).
7. **cookies.txt kopieren** nach `/opt/bytebots/secrets/cookies.txt`.
8. **`docker compose pull`**: Images liegen bereit, bevor umgeschaltet wird.

### Phase 1 — Umschalten (Wartungsfenster ~10 min)

1. **Idle-Check:** über die Admin-API prüfen, dass keine Guild gerade abspielt.
2. **Coolify-Steuerung stoppen**, damit es nicht dazwischenfunkt: `docker stop coolify coolify-realtime coolify-sentinel`.
3. **Alte App-Container + Traefik stoppen, nicht löschen:** `docker stop <music> <soundboard> <website> <warp> <pot> coolify-proxy`.
   ⚠️ **Die alten Bots müssen gestoppt sein, bevor die neuen starten.** Derselbe Discord-Token darf nicht doppelt laufen, und beide würden gleichzeitig in dieselbe SQLite schreiben.
4. **`docker compose up -d`**
5. **Verifizieren:**
   - Caddy hat Zertifikate für alle 4 Hostnamen geholt (`docker compose logs caddy`)
   - `https://bytebots.de`, `https://beatbyte.bytebots.de/status`, `https://soundboard.bytebots.de/api/health` → 200
   - Bot-Logs zeigen „online", `#status`-Embeds aktualisieren sich
   - `warp` healthy, `warp-cli status` → Connected
   - Playback-Test über die Admin-API, Web-Player-WebSocket verbindet sich
   - Soundboard-Dashboard-Login funktioniert (Secure-Cookie hinter Caddy)

**Rollback** (falls etwas nicht hochkommt):
`docker compose down` → `docker start coolify-proxy <alte App-Container>` → `docker start coolify coolify-realtime coolify-sentinel`. Die Volumes sind dieselben, dabei geht nichts verloren.

### Phase 2 — Coolify abbauen (nach ~1 Woche stabilem Betrieb)

1. Alte App-Container und alle `coolify*`-Container entfernen (`docker rm`), danach `docker image prune -a`.
2. `/data/coolify` als `tar` archivieren, dann löschen.
3. Das Docker-Netz `coolify` entfernen.
4. **Hetzner Cloud Firewall** anlegen: eingehend nur 22/tcp, 80/tcp, 443/tcp, 443/udp.
5. `COOLIFY_API_TOKEN` aus der Root-`.env` entfernen.
6. **Doku nachziehen:**
   - `CLAUDE.md`: Abschnitt „Deployment" (Coolify → compose/SSH, Env-Dateien statt Coolify-Env)
   - Dockerfile-Kopfkommentare
   - Kommentare in `.github/workflows/ci.yml`
   - Kommentare in `libs/*.js`
   - Claude-Memory `coolify-deployment`
7. Optional: Branch `coolify-deploy` → `deploy` umbenennen (ci.yml + CLAUDE.md anpassen).

---

## 4. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Doppelte Bot-Instanz (gleicher Token) beim Umschalten | Alte Container strikt **vor** `compose up` stoppen (Phase 1, Schritt 3) |
| TLS-Zertifikat kommt nicht (Port 80 belegt, DNS) | Traefik ist vorher gestoppt, DNS zeigt bereits auf den Server; Rollback in < 1 min |
| Env-Wert falsch übertragen | Keys aus der Coolify-Liste filtern, Zeilen zählen, danach Bot-Login im Log prüfen |
| GHCR-Pull scheitert (privates Paket) | PAT vor Phase 1 testen (`docker pull` in Phase 0, Schritt 8) |
| `cookies.txt`-Bind-Mount einer Einzeldatei | Funktioniert heute schon genauso (yt-dlp hat die Datei am 09.09. beschrieben) |
| POT-Plugin ↔ Provider-Version driftet | Provider-Image auf eine Version pinnen; der Entrypoint zieht das neueste Plugin (2.0.0 gegen Server 1.3.1 ist getestet und okay) |

---

## 5. Offene Entscheidungen

1. **Images bauen:** GitHub Actions → GHCR *(empfohlen: kein RAM-Engpass auf dem Server, Rollback per SHA-Tag)* **oder** direkt auf dem Server per `git pull && docker compose build` *(einfacher, kein PAT, aber der music-bot-Build belastet 1 vCPU / 1,9 GB)*.
2. **Branch-Name:** `coolify-deploy` behalten oder am Ende umbenennen.
3. **Zeitpunkt** für das Wartungsfenster.

**Unabhängig von der Migration:** YouTube sperrt die WARP-Exit-IP für lizenzierte Musik (siehe CHANGELOG 2026-09-12). Eine saubere Ausgangs-IP (z. B. Residential-Proxy) wird im neuen Setup einfach als `YTDLP_PROXY` in `env/music-bot.env` gesetzt.

**Aufwand:** ca. 2–3 h aktiv (inkl. CI-Job und Verifikation), Ausfallzeit ~10 min.

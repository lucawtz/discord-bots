# YouTube über die Heim-IP (Raspberry Pi Zero W)

YouTube sperrt die Cloudflare-WARP-IPs für lizenzierte Musik („Video unavailable“ / 403, Stand 2026-09-12). Über einen normalen Telekom-Anschluss funktionieren dieselben Songs; am 2026-09-13 per Test-Tunnel über den Mac verifiziert.

Deshalb hält der **Pi Zero W** (`pi-hole`, 192.168.178.42, läuft sonst AdGuard Home) eine SSH-Verbindung zum Server offen und stellt dort einen SOCKS-Proxy auf `10.0.0.1:1080` (docker0) bereit. Der music-bot schickt **nur YouTube** darüber (`YTDLP_PROXY` in `deploy/compose.yml`).

```
Discord-Bot (Hetzner) ──yt-dlp──▶ host.docker.internal:1080 ◀══ssh -R══ Pi Zero W (zuhause) ──▶ YouTube
```

**Gemessen:**
- Pi: ChaCha20-Poly1305 ≈ 290 Mbit/s
- Upload der Leitung ≈ 25 Mbit/s
- Bedarf pro Song ≈ 0,13 Mbit/s

## Einrichtung (einmalig)

1. **Pi:** `scp deploy/yt-tunnel/{setup-pi.sh,yt-tunnel.service} pihole@192.168.178.42:~/` → `ssh pihole@192.168.178.42 'sh setup-pi.sh key'` → gibt den Public Key aus.
2. **Server** (als root; **zweite SSH-Sitzung offen lassen**): `sh /opt/bytebots/repo/deploy/yt-tunnel/setup-server.sh "<Public Key>"`.
   - Legt den Nutzer `ytproxy` an (keine Shell, der Schlüssel darf nur `-R 10.0.0.1:1080`).
   - Schaltet **Passwort-Login ab** (`10-bytebots.conf`, sortiert vor `50-cloud-init.conf`).
   - Danach in einer **neuen** Sitzung prüfen, dass der Schlüssel-Login als root weiter geht.
3. **Pi:** `ssh pihole@192.168.178.42 'sh setup-pi.sh install'` → der Dienst `yt-tunnel` startet und startet nach Abbruch oder Reboot automatisch neu.
4. **Prüfen** auf dem Server: `ss -tln | grep 10.0.0.1:1080`.
5. **Bot:** Commit mit `YTDLP_PROXY` in `deploy/compose.yml` pushen → `scripts/deploy.sh music-bot` → Test mit einem gesperrten Song (z. B. „Sonne über Berlin“) in DevBotServer.

## Betrieb

- **Status auf dem Pi:** `systemctl status yt-tunnel`, Logs `journalctl -u yt-tunnel -f`
- **Pi aus / offline:** YouTube bekommt `ProxyError` → SoundCloud-Fallback. Chart-Musik geht dann nicht; normale YouTube-Videos gehen ebenfalls nicht, solange kein automatischer WARP-Fallback eingebaut ist.

## Rollback

- **Bot:** `YTDLP_PROXY` + `extra_hosts` aus `deploy/compose.yml` entfernen → deployen (zurück auf WARP)
- **Pi:** `sudo systemctl disable --now yt-tunnel && sudo rm /etc/systemd/system/yt-tunnel.service && sudo userdel -r yttunnel`
- **Server:** `userdel -r ytproxy`; Passwort-Login wieder erlauben mit `rm /etc/ssh/sshd_config.d/10-bytebots.conf && systemctl reload ssh`

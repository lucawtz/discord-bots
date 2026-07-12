# CLAUDE.md

Monorepo (pnpm-Workspace) mit zwei Discord-Bots und der zugehörigen Website.
Solo-Projekt von Luca, produktiv im Einsatz.

## Struktur

| Pfad | Was | Prod |
|---|---|---|
| `bots/music-bot` | **BeatByte** — Musik-Bot + Web-Player-API (Port 3001); `app/` ist der React/Tauri-Web-Player, wird im Docker-Build gebaut und von `api.js` serviert | beatbyte.bytebots.de |
| `bots/soundboard-bot` | **EarTastic** — Soundboard-Bot + Web-Dashboard (Port 3002) | soundboard.bytebots.de |
| `website` | Marketing-Site, React/Vite (Port 3003) | bytebots.de |
| `libs/` | Geteilter Code: `deploy-commands.js`, `rateLimiter.js`, `dbFile.js` — wird von beiden Bot-Dockerfiles mitkopiert, Require-Pfad `../../../libs/...` | — |

## Entwicklung

- `pnpm install` im Root; `pnpm dev` startet alle Services mit Watch, `bash dev.sh music|soundboard` einzeln.
- Jeder Bot lädt seine eigene `bots/<bot>/.env` (dotenv, gitignored). Die Root-`.env` ist nur die **Master-Vorlage** für die Coolify-Env-Blöcke — sie wird von den Bots NICHT gelesen. Lokal mit Dev-Bot-Tokens arbeiten (siehe `.env.example`), nie mit den Prod-Tokens.
- **Lockfile-Falle:** Lokal läuft pnpm, aber die Dockerfiles bauen mit `npm ci` gegen die `package-lock.json` **pro Workspace** (`bots/music-bot`, `bots/music-bot/app`, `bots/soundboard-bot`, `website`). Nach jeder Dependency-Änderung dort `npm install --package-lock-only` ausführen, sonst bricht der Coolify-Build.

## Deployment

- Coolify (Hetzner-Server) baut die drei Dockerfiles vom Branch **`coolify-deploy`** (Build-Kontext = Repo-Root). Push ≠ Deploy: der Deploy wird separat in Coolify (UI oder API) angestoßen. Details/UUIDs: Coolify-UI bzw. lokales Claude-Memory.
- **Secrets erreichen die Container ausschließlich als Coolify-Env-Variablen.** Niemals `.env`-Dateien deployen/committen — die Dockerfiles kopieren bewusst keine (`.dockerignore` blockt `**/.env*`).
- Env-Namen im Code: `DISCORD_TOKEN`, `CLIENT_ID` (nicht `DISCORD_CLIENT_ID`), `DISCORD_CLIENT_SECRET`, `API_KEY`.
- **music-bot darf nirgends `GUILD_ID` gesetzt haben:** Die Slash-Commands sind GLOBAL registriert (Bot läuft auf mehreren Servern). Mit gesetzter `GUILD_ID` registriert `libs/deploy-commands.js` guild-scoped → doppelte Commands. Registrierung läuft NICHT beim Bot-Start, sondern manuell: `npm run deploy` in `bots/music-bot` (nach jedem neuen/geänderten Command nötig).
- Der soundboard-bot braucht `GUILD_ID` weiterhin (Dashboard-Login prüft Guild-Mitgliedschaft).
- **YouTube (music-bot) funktioniert auf der Server-IP nur dreifach abgesichert** — WARP-Proxy + POT-Provider + EJS (`YT_EXTRACTOR_ARGS` in `src/index.js`). Diese Args nicht "vereinfachen". Die Defaults `warp:1080` und `pot-provider:4416` sind Aliasse im Coolify-Docker-Netz und existieren lokal nicht.
- Persistente Daten: nur `bots/*/data` (Coolify Persistent Storage). Die SQLite-DBs werden atomar geschrieben, tägliche Backups landen in `data/backups/` (7 werden behalten). Die Soundboard-Sounds liegen als BLOBs in der DB.

## Konventionen

- **Nach JEDER Änderung einen CHANGELOG.md-Eintrag schreiben** — auch für Nicht-Code-Änderungen (Coolify-Env, Command-Registrierung, Server-Eingriffe), denn die stehen sonst nirgends. Neueste oben, Präfix nach Bereich (`music-bot:`, `soundboard-bot:`, `website:`, `infra:`).
- Commit-Messages deutsch, Format `bereich: kurzbeschreibung`, Umlaute als ae/oe/ue.
- UI-Texte der Bots sind deutsch. Website-Texte IMMER in `website/src/i18n/de.js` UND `en.js` pflegen.
- CI (`.github/workflows/ci.yml`) läuft bei Push auf `coolify-deploy`: Syntax-Check beider Bots + beide Vite-Builds.

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
- Lokale Dev-Config liegt in **einer** Root-`.env.local` (gitignored, Vorlage: `.env.local.example`): Variablen tragen den Präfix `MUSIC_` bzw. `SOUNDBOARD_`, `libs/loadEnv.js` mappt sie beim Start auf die echten Namen. Bereits gesetzte Umgebungsvariablen gewinnen immer (so bleibt Prod/Coolify unberührt); eine `bots/<bot>/.env` wird als Ausnahmefall weiterhin gelesen. Die Root-`.env` ist nur die **Master-Vorlage** für die Coolify-Env-Blöcke — sie wird von den Bots NICHT gelesen. Lokal mit Dev-Bot-Tokens arbeiten, nie mit den Prod-Tokens.
- **Lockfile-Falle:** Lokal läuft pnpm, aber die Dockerfiles bauen mit `npm ci` gegen die `package-lock.json` **pro Workspace** (`bots/music-bot`, `bots/music-bot/app`, `bots/soundboard-bot`, `website`). Nach jeder Dependency-Änderung dort `npm install --package-lock-only` ausführen, sonst bricht der Coolify-Build.

## Deployment

- Coolify (Hetzner-Server) baut die drei Dockerfiles vom Branch **`coolify-deploy`** (Build-Kontext = Repo-Root). Push ≠ Deploy: der Deploy wird separat in Coolify (UI oder API) angestoßen. Details/UUIDs: Coolify-UI bzw. lokales Claude-Memory.
- **Secrets erreichen die Container ausschließlich als Coolify-Env-Variablen.** Niemals `.env`-Dateien deployen/committen — die Dockerfiles kopieren bewusst keine (`.dockerignore` blockt `**/.env*`).
- Env-Namen im Code: `DISCORD_TOKEN`, `CLIENT_ID` (nicht `DISCORD_CLIENT_ID`), `DISCORD_CLIENT_SECRET`, `API_KEY`.
- **music-bot darf in Prod nirgends `GUILD_ID` gesetzt haben:** Die Slash-Commands sind GLOBAL registriert (Bot läuft auf mehreren Servern). Mit gesetzter `GUILD_ID` registriert `libs/deploy-commands.js` guild-scoped → doppelte Commands. Registrierung läuft NICHT beim Bot-Start, sondern manuell: `npm run deploy` in `bots/music-bot` (nach jedem neuen/geänderten Command nötig). Lokal ist `MUSIC_GUILD_ID` in `.env.local` für den DEV-Bot gewollt — vor einem manuellen Prod-Command-Deploy vom lokalen Rechner die Zeile auskommentieren.
- **soundboard-bot: Commands sind GLOBAL, Scope entkoppelt von `GUILD_ID`.** `GUILD_ID` braucht der Bot zur Laufzeit weiter fürs Dashboard-Login (prüft Guild-Mitgliedschaft, `web/auth.js`) — es steuert aber NICHT mehr die Command-Registrierung. Der Deploy liest den Scope aus `COMMANDS_GUILD_ID` (`bots/soundboard-bot/src/deploy-commands.js` → `deployCommands(..., { guildIdVar: 'COMMANDS_GUILD_ID' })`): lokal ist `SOUNDBOARD_COMMANDS_GUILD_ID` in `.env.local` gesetzt → guild-scoped auf die Dev-Guild (Commands sofort sichtbar); in Prod/Coolify ist `COMMANDS_GUILD_ID` **nicht** gesetzt → GLOBAL. Registrierung wie beim music-bot manuell per `npm run deploy` in `bots/soundboard-bot` — vor einem manuellen **Prod**-Command-Deploy vom lokalen Rechner `SOUNDBOARD_COMMANDS_GUILD_ID` in `.env.local` auskommentieren (analog `MUSIC_GUILD_ID`), sonst landen die Prod-Commands guild-scoped in der Dev-Guild statt global. Grund für die Entkopplung: früher war `GUILD_ID` (immer gesetzt) auch der Command-Scope → Commands tauchten nur in der Haupt-Guild auf, nicht auf anderen Servern (2026-07-16/17).
- **YouTube (music-bot) funktioniert auf der Server-IP nur dreifach abgesichert** — WARP-Proxy + POT-Provider + EJS (`YT_EXTRACTOR_ARGS` in `src/index.js`). Diese Args nicht "vereinfachen". Die Defaults `warp:1080` und `pot-provider:4416` sind Aliasse im Coolify-Docker-Netz und existieren lokal nicht.
- Persistente Daten: nur `bots/*/data` (Coolify Persistent Storage). Die SQLite-DBs werden atomar geschrieben, tägliche Backups landen in `data/backups/` (7 werden behalten). Die Soundboard-Sounds liegen als BLOBs in der DB.

## Konventionen

- **Nach JEDER Änderung einen CHANGELOG.md-Eintrag schreiben** — auch für Nicht-Code-Änderungen (Coolify-Env, Command-Registrierung, Server-Eingriffe), denn die stehen sonst nirgends. Neueste oben, Präfix nach Bereich (`music-bot:`, `soundboard-bot:`, `website:`, `infra:`).
- Commit-Messages deutsch, Format `bereich: kurzbeschreibung`, Umlaute als ae/oe/ue.
- Bot-UI-Texte laufen seit 2026-07-17 über i18n (DE+EN, Deutsch = Default/Basis): neue Strings IMMER in `bots/<bot>/src/i18n/de.js` UND `en.js` pflegen und per `t(key, locale, vars)` ausgeben — nie hart verdrahten. Locale kommt aus `ctx.localeFor(interaction)` (music-bot) bzw. `i18n.localeFor(interaction)` (soundboard). Details/Deploy-Fallen: Claude-Memory `bot-i18n-de-en`. Website-Texte IMMER in `website/src/i18n/de.js` UND `en.js` pflegen.
- CI (`.github/workflows/ci.yml`) läuft bei Push auf `coolify-deploy`: Syntax-Check beider Bots + beide Vite-Builds.

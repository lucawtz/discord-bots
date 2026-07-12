# Changelog

Fortlaufendes Log aller Änderungen — auch solche, die NICHT im Code landen
(Command-Registrierungen, Coolify-Env-Änderungen, Server-Eingriffe).
Neueste Einträge oben. Format: `## YYYY-MM-DD`, ein Bullet pro Änderung,
mit Bereich (`music-bot:`, `soundboard-bot:`, `website:`, `infra:`).

## 2026-07-12

- **infra/music-bot:** Web-Player-Subdomain von `app.bytebots.de` auf **`beatbyte.bytebots.de`** umbenannt. Coolify: Domains auf `beatbyte.bytebots.de,app.bytebots.de` gesetzt (alte Subdomain bleibt übergangsweise als Alias), Env-Vars `OAUTH_REDIRECT_URI`/`FRONTEND_URL`/`APP_URL` auf beatbyte umgestellt, `ALLOWED_ORIGINS` enthält vorerst beide Subdomains + bytebots.de. Alle Code-Verweise ersetzt (Website-Seiten, i18n, music-bot `.env.production`/`.env.example`, Web-Player-Button in `src/index.js`). Manuell nötig: Cloudflare-A-Record `beatbyte` → 167.233.237.112 (proxied) + neue Redirect-URI `https://beatbyte.bytebots.de/api/auth/discord/callback` im Discord Developer Portal.
- **website:** Komplettes Redesign nach Claude-Design-Projekt „ByteBots Redesign" umgesetzt: neues Design-System in `theme.js` (Space Grotesk als Display-Font, Hintergrund `#08080b`, Karten mit Gradient + 18px-Radius, Cyan als EarTastic-Akzent), neues Inline-SVG-Logo, Navbar/Footer neu (Gradient-Underline, Status-Link, „Bot einladen"-CTA), Home mit animiertem Slash-Command-Mockup im Hero, Bots-Seite mit Produkt-Karten inkl. Mini-Player/Soundboard-Preview, Commands-Seite durchsuchbar + filterbar (28 echte Commands), Guide als 3-Schritte-Layout mit Setup/Troubleshooting-Karten, Status mit Puls-Banner. Alle neuen Texte in `de.js` UND `en.js`; Routen, i18n-Mechanik, Impressum/Datenschutz und Produktseiten (MusicBot/SoundboardBot) unverändert. Neue Shared-Komponenten in `src/components/ui.jsx`.
- **infra/music-bot:** Slash-Commands von guild-scoped auf **global** umgestellt, weil der Bot jetzt auf mehreren Servern läuft. `GUILD_ID` aus dem music-bot-Block der Root-`.env` entfernt (Coolify-Env hatte sie nie), alle 23 Commands global registriert und die alten Guild-Commands auf `879650782629199893` gelöscht (sonst Duplikate). Registrierung läuft manuell: `npm run deploy` in `bots/music-bot`.
- **music-bot:** Kick respektieren + Auto-Leave, wenn der Bot allein im Voice-Channel ist.
- **soundboard-bot:** Discord-Login fürs Dashboard statt API-Key-Pflicht (Guild-Mitglieder dürfen schreiben, X-API-Key bleibt Admin-Fallback).
- **music-bot:** Webapp-Cover repariert + Discover auf tagesaktuelle Charts.
- **music-bot:** Queue-Tracks sofort vorladen, Quadrat-Cover im Queue-Embed, Live-Fortschrittsbalken im Now-Playing-Embed.

## 2026-07-11

- **music-bot:** YouTube-Wiedergabe trotz IP-Block: yt-dlp über WARP-Proxy + POT-Provider + EJS (Details in der Coolify-Deployment-Notiz).
- **music-bot:** Now-Playing-Embed überarbeitet (Quadrat-Cover mit iTunes-Fallback, Link-Button-Fix, Nachricht bleibt 24h stehen), Skip-Prefetch, Auto-DJ-Shuffle.

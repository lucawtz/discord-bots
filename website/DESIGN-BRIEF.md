# Design-Briefing: ByteBots Website Redesign

**Für:** Claude (Designer-Session)
**Auftrag:** Die bestehende ByteBots-Website visuell überarbeiten — moderner, hochwertiger, mit klarer Markenidentität. Funktionalität und Seitenstruktur bleiben erhalten.

---

## 1. Was ist ByteBots?

ByteBots ist eine kleine Collection professioneller **deutscher Discord-Bots** mit eigenen Web-Apps:

| Bot | Name | Zweck | Web-App |
|-----|------|-------|---------|
| 🎵 Music Bot | **BeatByte** | Musik in Voice-Channels (YouTube/Spotify/Deezer/Apple Music), Slash-Commands, Auto-DJ, Filter/EQ, Queue | https://beatbyte.bytebots.de (Web Player mit Discord-Login) |
| 🔊 Soundboard Bot | **EarTastic** | Soundboard für Voice-Channels, eigene Sounds hochladen, Freesound-Suche | https://soundboard.bytebots.de (Dashboard mit Discord-Login) |

- **Hauptseite:** https://bytebots.de (das ist die Seite, die überarbeitet werden soll)
- Zielgruppe: deutschsprachige Discord-Server-Betreiber und -Nutzer
- Ton: professionell, aber locker/gamer-nah. Kein Corporate-Sprech.
- Die Bots sind aktuell **kostenlos** (es gibt eine Premium-Platzhalterseite für später).

## 2. Tech-Stack (MUSS beibehalten werden)

- **React 19 + Vite** (SPA), **MUI v7** (Material UI) mit Emotion
- **react-router-dom v7** — Routen siehe unten
- **i18n:** eigenes LanguageContext mit `src/i18n/de.js` + `src/i18n/en.js` (Deutsch ist Default). Alle neuen Texte müssen in BEIDE Dateien.
- Fonts aktuell: Inter (UI) + JetBrains Mono (Code/Commands) via Google Fonts
- Deployment: Vite-Build wird von einem kleinen Express-Server (`server.js`) statisch ausgeliefert, Docker-Container hinter Traefik. **Keine Server-Änderungen nötig.**
- Es gibt **keine separate CSS-Datei** — Styling läuft über das MUI-Theme (`src/theme.js`) und `sx`-Props in den Komponenten.

## 3. Projektstruktur (relevante Dateien)

```
website/
├── index.html              (Meta/OG-Tags, Fonts)
├── src/
│   ├── theme.js            ← zentrale Design-Tokens (MUI createTheme)
│   ├── App.jsx             (Routen)
│   ├── config.js           (URLs, Invite-Links)
│   ├── components/
│   │   ├── Layout.jsx, Navbar.jsx (272 Zeilen), Footer.jsx
│   │   ├── CommandList.jsx (Command-Tabellen)
│   │   ├── MusicPlayer.jsx (Demo-Player-Widget)
│   │   └── DiscordIcon.jsx, ErrorBoundary.jsx
│   ├── pages/
│   │   ├── Home.jsx (329 Z.)         ← Startseite mit Hero
│   │   ├── Bots.jsx                  ← Bot-Übersicht (Karten)
│   │   ├── MusicBot.jsx (384 Z.)     ← Produktseite BeatByte
│   │   ├── SoundboardBot.jsx (306 Z.)← Produktseite EarTastic
│   │   ├── Commands.jsx              ← alle Slash-Commands
│   │   ├── Guide.jsx                 ← Einrichtungs-Anleitung
│   │   ├── Premium.jsx               ← Platzhalter "kommt später"
│   │   ├── Status.jsx                ← Bot-Online-Status
│   │   ├── Changelog.jsx, Profile.jsx
│   │   ├── Impressum.jsx, Datenschutz.jsx (rechtlich – Inhalte NICHT ändern)
│   │   └── NotFound.jsx
│   ├── i18n/ (de.js, en.js, LanguageContext.jsx)
│   └── assets/hero.png
└── public/ (logo.png, bytebots-favicon.png)
```

## 4. Aktuelles Design (Ausgangslage)

**Design-Tokens aus `src/theme.js`:**
- Dark Mode only. Background `#09090b` (fast schwarz), Paper `#18181b`
- Primary: **Violett `#a855f7`** (light `#c084fc`, dark `#7c3aed`), Secondary: Pink `#d946ef`
- Text: `#fafafa` / `#a1a1aa`, Divider `rgba(255,255,255,0.06)`
- Radius 12px, Buttons ohne Uppercase, Cards mit feiner 1px-Border

**Einschätzung des Ist-Zustands:** solide, aber generisch — sieht nach "Standard-MUI-Dark-Theme mit Lila" aus. Wenig visuelle Identität, Hero wenig spektakulär, kaum Motion/Micro-Interactions, Produktseiten textlastig.

## 5. Design-Ziele (das eigentliche Briefing)

1. **Eigenständige Markenidentität**: ByteBots soll erkennbar werden, nicht wie ein MUI-Template aussehen. Violett darf als Markenfarbe bleiben (passt zu Discords Blurple-Umfeld und wird auch in den Bot-Embeds genutzt: `#6E41CC`), gern weiterentwickeln (Gradients, Glow, Akzente).
2. **Hero mit Wow-Effekt** auf der Startseite: die zwei Bots als Produkte inszenieren (z.B. animierte Discord-Embed-Mockups, Equalizer-/Wellen-Motive passend zu Musik & Sound). Es existiert ein Logo (`public/logo.png`, buntes Wellen-/Equalizer-Motiv auf dunklem Kreis) — daran darf sich die Bildsprache orientieren.
3. **Produktseiten (MusicBot/SoundboardBot) verkaufsstärker**: Features visuell zeigen (Screenshots/Mockups der Discord-Embeds und Web-Apps statt reiner Textlisten), klare CTAs ("Bot einladen", "Web Player öffnen").
4. **Commands-Seite** übersichtlicher: durchsuchbar/filterbar, Command-Chips in Monospace, Kategorien.
5. **Konsistente Komponenten**: Karten, Buttons, Chips, Tabellen aus einem Guss; Hover-States und dezente Transitions überall.
6. **Responsive** einwandfrei (Mobile-Navigation existiert, darf aber schöner werden).
7. **Performance/Umsetzbarkeit**: kein Canvas-/WebGL-Overkill, keine schweren Animation-Libs; CSS/Emotion-Animationen bevorzugt. Lighthouse sollte nicht schlechter werden.

**Nicht anfassen:** Routenpfade, i18n-Mechanik, Impressum/Datenschutz-Inhalte, `server.js`, `Dockerfile`, `config.js`-Logik (URLs dürfen referenziert werden).

## 6. Verbindliche Fakten für Inhalte

- Bot-Namen: **BeatByte** (Musik), **EarTastic** (Soundboard) — Dachmarke **ByteBots**
- Domains: bytebots.de · beatbyte.bytebots.de · soundboard.bytebots.de
- Beide Bots: deutsche Slash-Commands, Web-App mit "Mit Discord anmelden"
- BeatByte-Highlights: /play mit YouTube/Spotify/Apple-Music/Deezer-Links, Live-Fortschrittsbalken im Now-Playing-Embed, Album-Cover, Auto-DJ (zufällige passende Songs), Filter (Bassboost/Nightcore/Slowed/Custom-EQ), Queue mit Vorladen (schneller /skip), Skip-Votes, Playlists speichern
- EarTastic-Highlights: Sounds hochladen & abspielen, Freesound-Suche, Web-Dashboard
- Sprache der Website: Deutsch (Default) + Englisch vollständig

## 7. Arbeitsweise & Deliverables

1. Lokal starten: `cd website && npm install && npm run dev` (Vite, Port 5173)
2. Zuerst `src/theme.js` als Design-System überarbeiten (Farben, Typo, Komponenten-Overrides), dann Seiten/Komponenten.
3. **Deliverable:** geänderte Dateien im bestehenden Projekt (JSX + theme.js + ggf. index.html für Fonts/Meta). Keine neuen Frameworks, keine Tailwind-Migration.
4. Neue Texte immer in `src/i18n/de.js` UND `src/i18n/en.js` ergänzen.
5. Assets: neue Grafiken als SVG inline oder in `src/assets/`; das bestehende Logo darf neu interpretiert, aber nicht ersetzt werden ohne Rücksprache.
6. Bitte am Ende kurz dokumentieren, was geändert wurde (Datei-Liste + Design-Entscheidungen).

## 8. Offene Gestaltungsfreiheit

Explizit erwünscht: mutigere Typo-Hierarchie, Gradient-/Glow-Akzente, animierte Hero-Elemente (CSS), Discord-Mockup-Komponenten, Dark-Theme-Verfeinerung (Tiefe durch Layering statt flacher Flächen). Bei Unsicherheit: lieber ein Konzept mit 2–3 Varianten für den Hero vorschlagen, bevor alles umgebaut wird.

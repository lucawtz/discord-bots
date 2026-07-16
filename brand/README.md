# ByteBots — Bot-Identität (Design-System)

Wiederverwendbare Vorlage für die Avatare, Banner und App-Icons der ByteBots-Bots.
Alles wird aus Design-Tokens gebaut — regenerierbar per [`brand/generate.js`](generate.js).

> **Konzept in einem Satz:** dunkler Tile-Grund + das bot-eigene Motiv **voll im
> Hintergrund** (Equalizer / Soundboard / Schild) + der zentrale ByteBots-**„/"-Kreis**
> oben drauf als gemeinsames Wiedererkennungs-Merkmal.

---

## 1. Design-Tokens

### Hintergrund (in JEDEM Avatar gleich)
Radialer „Tile": `radialGradient` cx `50%` cy `36%` r `76%`, Stops `#2a1740` → `#0b0b10`.

### Farbe je Bot (jeder besetzt sein Ende des ByteBots-Spektrums Lila→Cyan)
| Bot | Rolle | Gradient (a → mid → b) | Banner-Glow |
|---|---|---|---|
| **BeatByte** | Musik | `#c084fc` → `#d946ef` → `#38d6f5` | `#a855f7` |
| **EarTastic** | Soundboard | `#3ee0f5` → `#22d3ee` → `#1f9fd6` (cyan) | `#22d3ee` |
| **ByteBots Admin** | Verwaltung | `#a855f7` → `#d946ef` → `#22d3ee` (voll) | `#8b5cf6` |

Soundboard-Pad-Farben: Standard `#3ee0f5→#1f9fd6`, Blau `#5a86f0→#3b5fd6`, „leuchtend" `#d6fbff→#67ecff` (jeweils vertikaler Verlauf).

---

## 2. Der ByteBots-„/" (Marke)

Feste Geometrie, **immer gleich groß** (nie skalieren, außer im Badge s.u.):
- **Slash:** `rect x=234 y=192 w=44 h=146 rx=22`, `transform="rotate(20 256 265)"`
- **Cursor:** `rect x=292 y=300 w=32 h=32 rx=9`

## 3. Der „/"-Kreis (Badge) — zentrales Wiedererkennungs-Merkmal

Liegt **oben** auf dem Motiv, in der Mitte (256,256). Aufbau von unten nach oben:
1. **Trenn-Halo:** `circle r=104 fill=#0b0b10 opacity=.55` (hebt den Kreis vom Motiv ab)
2. **Kreis:** `circle r=94 fill=#100a1c`
3. **Ring:** `circle r=94 fill=none stroke=<Bot-Gradient> stroke-width=7`
4. **Marke:** der „/" (Slash+Cursor) auf `scale(0.6)` um (256,256):
   `translate(256 256) scale(0.6) translate(-256 -265)`

---

## 4. Motive (voll, im Hintergrund) — was den Bot identifiziert

- **BeatByte → Equalizer:** 15 mittig ausgerichtete Balken, `x = 46 + i*28`, `w=20`, `rx=10`,
  Höhen `[90,150,110,210,150,240,180,250,180,240,150,210,110,150,90]` (zentriert um `y=256`),
  Füllung = Bot-Gradient (`userSpaceOnUse`, x1=46 → x2=466, damit der Verlauf über alle Balken läuft).
- **EarTastic → Soundboard:** 3×3-Grid, Zell-Zentren `{128, 256, 384}`, Pad `108×108 rx=24`;
  Pad-Farben abwechselnd (siehe `GRID_COL` im Generator) — 1–2 „leuchtende" Pads als Akzent.
- **ByteBots Admin → Schild:** `path M256 96 L408 144 L408 250 C408 344 344 404 256 440 C168 404 104 344 104 250 L104 144 Z`,
  `fill=none stroke=<Gradient> stroke-width=16`.

## 5. Avatar-Aufbau (512×512 viewBox)

```
1. <rect 512 fill=url(#tile)>        ← dunkler Grund
2. Motiv (voll)                       ← Equalizer / Soundboard / Schild
3. Badge („/"-Kreis)                  ← oben drauf, zentral
```

Discord beschneidet Avatare zum **Kreis** — der Tile füllt das ganze Quadrat, daher
keine transparenten Ecken. Klein (Mitgliederliste) trägt die **Silhouette + Farbe** die
Unterscheidung, der „/"-Kreis die Wiedererkennung.

## 6. Banner (960×540 viewBox)

```
1. <rect fill=#0a0910>                             ← dunkler Grund
2. Glow-Ellipse (radial, Bot-Glow-Farbe, oben)
3. Bot-Logo (Motiv + Badge) einfarbig, opacity .15, rechts, ge-ghosted
4. Vignette (radial, Ecken dunkler)
5. Akzentlinie unten (y=534, h=6, Bot-Gradient)
```
Die linke Hälfte bleibt ruhig — dort sitzt im Discord-Profil der Avatar.

---

## 7. Rendern

SVG ist die Quelle (`brand/svg/`). PNGs per `@resvg/resvg-js` (oder beliebigem SVG→PNG-Tool):
- **Avatar / App-Icon:** 1024×1024 PNG
- **Banner:** 960×540 PNG

```bash
node brand/generate.js            # schreibt brand/svg/ (+ brand/png/ falls resvg installiert)
npm i -D @resvg/resvg-js          # optional, fuer PNG-Ausgabe
```

## 8. Wo eingesetzt / wie anwenden

| Ziel | Wie |
|---|---|
| **Discord-Avatar** | `PATCH /users/@me` `{ "avatar": "data:image/png;base64,…" }` (Bot-Token) |
| **Discord-Banner** | `PATCH /users/@me` `{ "banner": "…" }` |
| **Discord-App-Icon** | `PATCH /applications/@me` `{ "icon": "…" }` |
| **Website** | `website/src/assets/{beatbyte,eartastic}-avatar.png` (genutzt via `BotAvatar` in `components/ui.jsx`) |
| **BeatByte Web-Player** | `bots/music-bot/app/public/beatbyte-avatar.png` (Favicon in `index.html`, Logos in `src/App.jsx`) — **lokal**, nicht per Discord-CDN-URL (Hash ändert sich bei jedem Avatar-Update) |

Tokens (Prod-Bot-Token: Root-`.env`; Admin: `.env.local` `ADMIN_DISCORD_TOKEN`) — nie ausgeben.
Nach jeder Avatar-Änderung CDN-verifizieren (`GET` der `cdn.discordapp.com/avatars/…`-URL → HTTP 200).

## 9. Einen neuen Bot ergänzen

1. In `brand/generate.js` einen Gradient-Token + Glow-Farbe hinzufügen.
2. Ein **Motiv** definieren (voll, im Hintergrund) — die klare, im Kleinen erkennbare Form ist entscheidend.
3. Avatar = `tile + Motiv + badge(<gradient>)`, Banner = `banner(glow, accA, accB, symbol)`.
4. `node brand/generate.js`, dann per API/Assets ausrollen (Abschnitt 8).

## 10. Historie / Prinzipien (aus dem Design-Prozess gelernt)

- **„/" immer gleich groß** und zentral als Marke — abgeleitet vom Admin-Schild.
- Motiv **muss im Kleinen sofort erkennbar** sein (Equalizer ≠ Soundboard ≠ Schild).
- Motiv **voll im Hintergrund**, der „/"-Kreis liegt drauf und schafft keinen Platz frei.
- Kein „3D-Glaskugel"-Look — flach mit dezentem 2D-Glow.
- Off-Brand-Vorgänger (Regenbogen-Equalizer / 3D-Roboter) bewusst ersetzt.

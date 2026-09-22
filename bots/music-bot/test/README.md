# Tests — BeatByte

Drei Stufen, absteigend nach Geschwindigkeit und aufsteigend nach Realitätsnähe.

## 1. Offline (`pnpm --filter discord-music-bot test`)

Läuft ohne Token, ohne Netz, in ~5 Sekunden. Das ist die Stufe, die in CI läuft
und die bei jeder Änderung an `/play` oder `playNext` grün sein muss.

Geladen wird der **echte** Bot: `require('../src/index.js')` mit
`BEATBYTE_TEST=1`. Die Variable schaltet nur drei Dinge ab, sonst nichts:

- kein `client.login()` — der Bot bleibt offline, `index.js` ist reines Modul
- kein `yt-dlp -U`-Prozess beim Laden
- Hintergrund-Timer per `unref()`, damit der Testprozess sauber endet

Gefälscht wird ausschließlich, was nach draußen geht:

| echt | gefälscht |
| --- | --- |
| `playNext`, `createStream`, alle Embeds | Discord (Interaction, Kanal, Nachricht) |
| FFmpeg — transkodiert wirklich | yt-dlp — liefert stattdessen eine Audiodatei |
| `AudioPlayer` aus `@discordjs/voice` | Deezer/Quellensuche (feste Werte je Test) |

Damit prüfen die Tests echte Aussagen: dass die Wiedergabe den Zustand
`playing` erreicht, dass genau **eine** Nachricht entsteht, und in welcher
Reihenfolge ihre Zustände wechseln.

Zwei Nahtstellen machen das möglich, beide nur im Testmodus wirksam:

- `ctx.setSpawn(fn)` — ersetzt `child_process.spawn` für yt-dlp und FFmpeg
- `ctx.attachPlayerEvents(guildId, player, queue)` — hängt die Player-Logik an
  einen AudioPlayer ohne Voice-Verbindung (sonst steckt sie in der Connection)

Einzelne Commands lassen sich testen, indem man `ctx` flach kopiert und nur die
Außenkanten ersetzt (`{ ...ctx, searchTrack: async () => … }`). Der Rest bleibt
der echte Code.

## 2. Netz (`pnpm --filter discord-music-bot test:net`)

Zusätzlich die Deezer-Tests gegen die echte API — sie trägt Sofort-Karte und
Autocomplete. Nicht in CI, damit der Build nicht an einer fremden API hängt.

## 3. Live (`pnpm --filter discord-music-bot test:live`)

`dev-test.js`: bootet den echten Bot gegen einen echten Test-Server und fährt
jeden Command durch, inklusive Voice-Verbindung und echtem yt-dlp.

Braucht in der Root-`.env.local`:

```
DISCORD_TOKEN=…     # Bot-Token des Test-Bots
GUILD_ID=…          # Test-Server, in dem der Bot ein Voice-Recht hat
MUSIC_YTDLP_PATH=…  # optional, sonst wird /play als SKIP gewertet
```

## 4. Lavalink-Beweislauf (`lavalink` + `lavalink:proof`)

Das Tor vor dem Umbau auf Lavalink. Klärt die drei Fragen, die offline nicht zu
beantworten sind — spielt Lavalink überhaupt Ton, spielt es **lizenzierte**
Musik (das Problem, das zum Pi-Tunnel geführt hat), und laufen Seek, Filter und
Lautstärke wirklich live ohne Neu-Laden?

```
Terminal 1:  pnpm --filter discord-music-bot lavalink
             # lädt Lavalink 4.2.2 beim ersten Mal selbst (~96 MB) und startet es
             # --socks 1080  schickt YouTube durch einen SOCKS-Proxy (wie in Prod)

Terminal 2:  pnpm --filter discord-music-bot lavalink:proof
             # --query "Interpret Titel"  für einen anderen Track
```

Braucht `MUSIC_DISCORD_TOKEN` und `MUSIC_GUILD_ID` in der Root-`.env.local` und
einen Voice-Channel, in dem der Bot „Verbinden" darf. Zum Mithören selbst in den
Channel gehen.

### YouTube braucht OAuth

Gemessen am 22.09.2026: **ohne OAuth spielt nur 1 von 4 Tracks.** Die Clients,
die noch brauchbare Audio-Formate liefern (TVHTML5 & Co.), sind OAuth-Clients
und werden ohne Anmeldung nicht einmal versucht. Übrig bleiben `WEB` (SABR, gar
keine https-Formate), `WEBEMBEDDED` und `ANDROID_VR` („requires login"). Ein
poToken hilft dort nicht — er betrifft laut Plugin-README nur WEB und
WEBEMBEDDED, also genau die kaputten.

```
node test/lavalink-local.js --oauth
```

Zeigt einen Device-Code. Den auf https://www.google.com/device eingeben —
**nur mit einem Wegwerf-Google-Konto**, davor warnt das Plugin selbst. Danach
gibt Lavalink einen Refresh-Token aus; der gehört als
`MUSIC_YOUTUBE_REFRESH_TOKEN` in die Root-`.env.local`, dann entfällt die
Anmeldung künftig.

Diagnose, wenn Tracks nicht spielen: `node test/yt-probe.js` zeigt, welche
spielen, `node test/yt-clients.js` zeigt den Grund **pro Client** — die
Sammelmeldung „All clients failed to load the item" verschweigt ihn.

Der Lauf gilt nur als grün, wenn **kein** `TrackEndEvent` während Seek, Filter
und Lautstärke auftritt — ein Neustart des Tracks wäre genau der heutige Zustand.

Die Offline-Tests des Clients (`lavalink.test.js`) laufen gegen einen echten,
aber gefälschten Lavalink-Server (`fake-lavalink.js`) — ohne Java und ohne Netz.

## Fixture

`fixtures/tone.ogg` (3 s Sinuston, Ogg/Opus) wird beim ersten Lauf mit FFmpeg
erzeugt und liegt nicht im Repo. Löschen erzwingt eine Neuerzeugung.
Dasselbe gilt für `fixtures/lavalink/` — der ganze Ordner ist gitignored.

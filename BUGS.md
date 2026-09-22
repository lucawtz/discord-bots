# Bug-Liste

Stand: 2026-09-17 · Bot: `bots/music-bot`

## Behoben

### BUG-1 — Bot kam nach manuellem Trennen sofort wieder in den Channel
**Behoben** (vor dem 2026-09-22, Fix war bereits in `prod`): Der
`Disconnected`-Handler prueft jetzt `WebSocketClose` mit `closeCode === 4014`
und wartet kurz auf `Connecting` — kommt das nicht, war es ein Kick und die
Queue wird abgebaut, statt neu zu verbinden.

### BUG-2 — Bot verliess den Channel nicht automatisch, wenn nichts gespielt wurde
**Behoben am 2026-09-22.** Ursache: `scheduleLeave` wurde NUR gerufen, wenn die
Warteschlange leerlief oder jemand `/stop` drueckte — nicht beim Verbinden. Wer
den Bot per `/join` oder ueber den Web-Player holte und nichts abspielte, hatte
ihn dauerhaft im Kanal. Der Timer wird jetzt in `setupVoiceConnection` gestellt,
also bei JEDEM Verbindungsaufbau. Harmlos bei sofortiger Wiedergabe: beim Ablauf
wird geprueft, ob wirklich nichts laeuft. Drei Tests in `test/leave-timer.test.js`.

## Offen

### BUG-1 — Bot kommt nach manuellem Trennen sofort wieder in den Channel

**Schwere:** hoch

**Reproduktion**
1. Bot ist in einem Voice Channel (egal ob Wiedergabe läuft oder nicht).
2. In Discord auf den Bot → „Verbindung trennen" (bzw. Bot aus dem Channel werfen).
3. Bot verschwindet kurz aus dem Channel.

**Erwartet:** Bot bleibt draußen, Queue/Connection wird abgebaut.

**Tatsächlich:** Bot ist sofort wieder im Channel und verbindet sich neu.

**Vermutete Ursache**
Der `Disconnected`-Handler in [index.js:1501-1520](bots/music-bot/src/index.js#L1501-L1520)
behandelt jedes Disconnect als Netzwerkstörung: Er wartet darauf, dass die Connection
wieder `Ready` **oder `Signalling`** wird, und lässt sie dann leben. Beim manuellen Kick
schickt Discord aber `WebSocketClose 4014` und discord.js versucht automatisch ein
Re-Signalling — dieses zählt der Handler als „erfolgreicher Reconnect", statt
`destroyQueue()` aufzurufen.

**Fix-Richtung**
Im Handler `newState.reason` prüfen: bei
`VoiceConnectionDisconnectReason.WebSocketClose` mit `closeCode === 4014` (und bei
`Manual`) direkt `destroyQueue(guildId)` statt Reconnect-Versuch. Nur bei echten
Netzwerkabbrüchen weiter reconnecten, und dort nur auf `Ready` warten, nicht auf
`Signalling`.

---

### BUG-2 — Bot verlässt den Channel nicht mehr automatisch, wenn nichts gespielt wird

**Schwere:** mittel

**Reproduktion**
1. Bot in einen Voice Channel holen (Web Player „Verbinden" oder Slash-Command).
2. Nichts abspielen bzw. Queue leerlaufen lassen.
3. > 5 Minuten warten.

**Erwartet:** Nach `LEAVE_TIMEOUT_MS` (5 Min., [index.js:18](bots/music-bot/src/index.js#L18))
verlässt der Bot den Channel, vorher kommt die „👋 Ciao!"-Warnung.

**Tatsächlich:** Bot bleibt dauerhaft im Channel, keine Warnung, kein Leave.

**Vermutete Ursachen (zwei getrennte Pfade)**
1. **Leave-Timer wird gelöscht und nicht neu gesetzt:**
   `setupVoiceConnection()` löscht in [index.js:1460-1467](bots/music-bot/src/index.js#L1460-L1467)
   `leaveTimer` + `_leaveWarningTimer` und kehrt bei bestehender Connection sofort
   zurück (`return queue`) — ohne den Timer wieder zu starten. Jeder spätere Aufruf
   (Web-Player-Join, `ensureConnection()` aus irgendeinem Command, fehlgeschlagener
   `/play`) killt damit den laufenden Leave-Timer dauerhaft.
2. **Join ohne Wiedergabe startet nie einen Timer:**
   `scheduleLeave()` wird nur aufgerufen, wenn eine Queue leerläuft
   ([index.js:1742](bots/music-bot/src/index.js#L1742)), bei `/stop`
   ([stop.js:29](bots/music-bot/src/commands/stop.js#L29)) und aus
   [api.js:928](bots/music-bot/src/api.js#L928). Ein reines Verbinden via
   `joinChannel()` ([index.js:1576](bots/music-bot/src/index.js#L1576)) setzt keinen
   Timer → Bot sitzt unbegrenzt im Channel.

**Fix-Richtung**
- In `setupVoiceConnection()` den Timer nur löschen, wenn danach wirklich etwas
  abgespielt wird; beim Early-Return mit bestehender Connection und `!queue.current`
  wieder `scheduleLeave(guildId)` aufrufen.
- Nach `joinChannel()` ebenfalls `scheduleLeave()` starten, solange nichts läuft.
- Zusätzlich sinnvoll: Leave-Timer auch starten, wenn der Channel leer ist
  (aktuell wird in `voiceStateUpdate`, [index.js:1940-1964](bots/music-bot/src/index.js#L1940-L1964),
  nur auto-gepaust, nie geleavt) — sonst bleibt der Bot bei „alle User weg" mit
  pausiertem Player für immer drin.

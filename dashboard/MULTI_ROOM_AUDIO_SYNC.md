# Multi-Room Audio Sync - Feature Design Document

> **Codename: SoundStage**
> Version 1.0 | April 2026 | Developer & Product Briefing

---

## Inhaltsverzeichnis

1. [Funktionsprinzip](#1-funktionsprinzip)
2. [Sync-Arten](#2-sync-arten)
3. [Audio-Pipeline](#3-audio-pipeline)
4. [Discord Voice Limitations & Workarounds](#4-discord-voice-limitations--workarounds)
5. [Dashboard-UI](#5-dashboard-ui)
6. [Premium / Monetarisierung](#6-premium--monetarisierung)
7. [Technische Architektur](#7-technische-architektur)
8. [Edge Cases](#8-edge-cases)
9. [Performance-Optimierung](#9-performance-optimierung)
10. [Bonus: Feature-Branding](#10-bonus-feature-branding)

---

## 1. Funktionsprinzip

### 1.1 Wie Multi-Room Playback technisch funktioniert

**Kernproblem:** Ein Discord-Bot kann pro Guild nur **eine** Voice-Connection halten. `@discordjs/voice` bindet eine `VoiceConnection` an eine `guildId`, nicht an eine `channelId`. Ein einzelner Bot-Client kann also nicht gleichzeitig in Channel A und Channel B desselben Servers Audio abspielen.

**Loesung: Multi-Instance Architecture**

```
                          +------------------+
                          |   Orchestrator   |
                          |   (Main Bot)     |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |              |               |
              +-----v----+  +-----v----+   +------v---+
              | Worker 1  |  | Worker 2  |  | Worker 3 |
              | (Bot App) |  | (Bot App) |  | (Bot App)|
              | Channel A |  | Channel B |  | Channel C|
              +----------+  +----------+   +----------+
```

Es gibt **zwei technische Ansaetze**:

#### Ansatz A: Multi-Application Workers (Empfohlen)

Fuer jeden gleichzeitigen Voice-Channel wird eine eigene Bot-Application (mit eigenem Token) verwendet. Diese Worker-Bots werden vom Haupt-Bot orchestriert.

```javascript
// orchestrator.js - Zentrale Steuerung
class RoomOrchestrator {
  constructor(mainBot) {
    this.mainBot = mainBot;          // Haupt-Bot fuer Commands
    this.workers = new Map();         // guildId:channelId -> WorkerBot
    this.workerPool = [];             // Verfuegbare Worker-Tokens
  }

  async createRoom(guild, channel, playlist) {
    const workerToken = this.workerPool.shift();
    if (!workerToken) throw new Error('No available workers');

    const worker = new WorkerBot(workerToken);
    await worker.connect(guild, channel);
    worker.setPlaylist(playlist);

    this.workers.set(`${guild.id}:${channel.id}`, worker);
    return worker;
  }
}
```

**Vorteile:**
- Volle Isolation pro Channel
- Kein Konflikt mit Discord's 1-Connection-per-Guild Limit
- Unabhaengige Audio-Player pro Room
- Skaliert horizontal

**Nachteile:**
- Erfordert mehrere Bot-Applications (je nach Plan 2-10)
- Jeder Worker-Bot muss dem Server hinzugefuegt werden
- Mehr Token-Verwaltung

#### Ansatz B: Child-Process Workers (Alternative)

Ein einzelner Bot spawnt Worker-Prozesse, die jeweils einen eigenen Discord-Client starten, aber den gleichen Token verwenden. **Achtung:** Discord erlaubt technisch nur eine Voice-Connection pro Guild pro User/Bot. Daher ist Ansatz B nur mit separaten Tokens moeglich.

**Fazit:** Ansatz A ist die einzig gangbare Loesung fuer echtes Multi-Room innerhalb eines Guilds.

### 1.2 Wie der Bot mehrere Voice-Verbindungen stabil haelt

```
Stability Layer
├── Heartbeat Monitor     (prueft alle 5s den VoiceConnection-State)
├── Auto-Reconnect        (bis zu 3 Versuche bei Disconnect)
├── Health Broadcast       (Worker → Orchestrator Status alle 10s)
├── Dead Worker Detection  (Timeout nach 30s ohne Heartbeat)
└── Graceful Failover      (Queue-State wird persistent gehalten)
```

**Connection State Machine pro Worker:**

```
  CONNECTING ──→ READY ──→ PLAYING
      │             │          │
      │             │          ▼
      │             │      PAUSED
      │             │          │
      ▼             ▼          ▼
  FAILED ←──── DISCONNECTED ←─┘
      │
      ▼
  RETRY (max 3x) ──→ DEAD
```

**Implementierung:**

```javascript
class WorkerBot {
  constructor(token, orchestrator) {
    this.client = new Client({ intents: [GatewayIntentBits.GuildVoice] });
    this.token = token;
    this.orchestrator = orchestrator;
    this.state = 'idle';
    this.heartbeatInterval = null;
  }

  async connect(guildId, channelId) {
    await this.client.login(this.token);

    this.connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: this.client.guilds.cache.get(guildId).voiceAdapterCreator,
      selfDeaf: true,
    });

    // State-Monitoring
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Versuche Reconnect (Discord wechselt manchmal Voice-Server)
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        // Harter Reconnect
        this.connection.destroy();
        await this.connect(guildId, channelId);
      }
    });

    // Heartbeat an Orchestrator
    this.heartbeatInterval = setInterval(() => {
      this.orchestrator.heartbeat(this.id, {
        state: this.state,
        channelId,
        currentTrack: this.currentTrack,
        latency: this.connection?.ping?.udp ?? -1,
        uptime: process.uptime(),
      });
    }, 10_000);
  }
}
```

### 1.3 Latenz-Management zwischen den Channels

**Discord Voice Latency-Quellen:**

| Quelle | Typische Latenz | Kontrollierbar? |
|--------|----------------|-----------------|
| Audio Encoding (Opus) | 5-20 ms | Ja (Frame-Size) |
| UDP Transport zu Discord | 20-80 ms | Nein |
| Discord Voice Server → Client | 20-80 ms | Nein |
| Jitter Buffer beim Client | 40-200 ms | Nein |
| FFmpeg Processing | 10-30 ms | Teilweise |

**Gesamtlatenz pro Hop:** ~100-400 ms (typisch)

**Cross-Channel Drift:** Wenn Worker A und Worker B den gleichen Song spielen, kann der Drift bis zu **800 ms** betragen — hoerbar, wenn ein User zwischen Channels wechselt.

### 1.4 Synchrone Rooms vs. Individuelle Rooms

| Eigenschaft | Synchrone Rooms | Individuelle Rooms |
|-------------|----------------|--------------------|
| **Playlist** | Identisch (Shared State) | Unabhaengig pro Room |
| **Playback-Position** | Synchronisiert (NTP-basiert) | Eigenstaendig |
| **Skip/Pause** | Wirkt auf alle Rooms | Nur lokaler Room |
| **Use Case** | Server-Radio, Events | Verschiedene Genres/Stimmungen |
| **Komplexitaet** | Hoch (Clock-Sync noetig) | Niedrig |
| **Latenz-Toleranz** | Kritisch (<200 ms Drift) | Irrelevant |

---

## 2. Sync-Arten

### 2.1 Perfekt synchronisierte Channels ("Radio Mode")

**Prinzip:** Alle Rooms spielen den exakt gleichen Audio-Stream zur gleichen Zeit. Der Orchestrator fungiert als zentrale Clock.

```
                    ┌─────────────────┐
                    │  Shared Clock   │
                    │  (NTP-aligned)  │
                    └────────┬────────┘
                             │
              Broadcast: "Play track X at T+offset"
                             │
               ┌─────────────┼─────────────┐
               │             │              │
          ┌────▼───┐   ┌────▼───┐   ┌─────▼──┐
          │Room A  │   │Room B  │   │Room C  │
          │offset: │   │offset: │   │offset: │
          │ +0ms   │   │ +12ms  │   │ -8ms   │
          └────────┘   └────────┘   └────────┘
```

**Synchronisations-Algorithmus:**

```javascript
class SyncController {
  constructor() {
    this.rooms = new Map();
    this.masterClock = null;
    this.syncInterval = null;
  }

  // Phase 1: Latenz-Messung zwischen Orchestrator und jedem Worker
  async measureLatencies() {
    const measurements = new Map();

    for (const [roomId, worker] of this.rooms) {
      const latencies = [];
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        await worker.ping(); // IPC roundtrip
        const end = process.hrtime.bigint();
        latencies.push(Number(end - start) / 1_000_000); // ms
      }
      // Median statt Mean (robuster gegen Ausreisser)
      latencies.sort((a, b) => a - b);
      measurements.set(roomId, latencies[5]);
    }

    return measurements;
  }

  // Phase 2: Synchronisierter Playback-Start
  async syncPlay(trackUrl, seekPosition = 0) {
    const latencies = await this.measureLatencies();
    const maxLatency = Math.max(...latencies.values());

    // Startzeit = jetzt + maxLatency + Sicherheitspuffer
    const startTime = Date.now() + maxLatency + 500;

    const promises = [];
    for (const [roomId, worker] of this.rooms) {
      const workerLatency = latencies.get(roomId);
      const delay = maxLatency - workerLatency; // Kompensation

      promises.push(
        worker.schedulePlay({
          trackUrl,
          seekPosition,
          startAt: startTime + delay,
        })
      );
    }

    await Promise.all(promises);
  }

  // Phase 3: Periodische Drift-Korrektur
  startDriftCorrection(intervalMs = 30_000) {
    this.syncInterval = setInterval(async () => {
      const positions = new Map();

      for (const [roomId, worker] of this.rooms) {
        positions.set(roomId, await worker.getPlaybackPosition());
      }

      const targetPosition = positions.values().next().value; // Master
      for (const [roomId, position] of positions) {
        const drift = Math.abs(position - targetPosition);
        if (drift > 200) { // >200ms Drift → Korrektur
          const worker = this.rooms.get(roomId);
          await worker.seekTo(targetPosition);
        }
      }
    }, intervalMs);
  }
}
```

**Realistisches Ergebnis:** Drift von **50-200 ms** ist erreichbar. Perfekte Sample-genaue Synchronisation ist ueber Discord nicht moeglich, da der Transport zum End-User nicht kontrollierbar ist. Fuer einen Radio-Effekt (User hoert nur einen Channel gleichzeitig) ist das voellig ausreichend.

### 2.2 Unterschiedliche Playlists pro Channel ("Zone Mode")

Jeder Room hat einen eigenstaendigen Playback-State:

```javascript
class IndependentRoom {
  constructor(worker, config) {
    this.worker = worker;
    this.queue = {
      tracks: [],
      current: null,
      loopMode: 'off',        // off | song | queue
      volume: config.volume ?? 1.0,
      shuffle: false,
    };
    this.config = {
      name: config.name,          // "Chill Lounge"
      channelId: config.channelId,
      genre: config.genre,         // Optional: Auto-DJ Hint
      maxQueueSize: config.maxQueueSize ?? 50,
      allowUserRequests: config.allowUserRequests ?? true,
    };
  }
}
```

**Room-Typen:**

| Typ | Beschreibung | Interaktion |
|-----|-------------|-------------|
| **Open Room** | Jeder kann Songs queuen | Volle Queue-Controls |
| **DJ Room** | Nur bestimmte Rollen koennen queuen | Moderiert |
| **Auto-DJ Room** | Bot spielt automatisch basierend auf Genre | Keine manuelle Queue |
| **Relay Room** | Spiegelt einen anderen Room (Sync) | Nur Lautstaerke aenderbar |

### 2.3 Server-Weite Audiomodi

**Vordefinierte Presets:**

```javascript
const SERVER_PRESETS = {
  // Lobby-Modus: Chill-Musik im Hauptchannel
  lobby: {
    rooms: [
      { channel: 'general', playlist: 'lofi-chill', volume: 0.3 }
    ]
  },

  // Gaming-Modus: Unterschiedliche Musik je nach Aktivitaet
  gaming: {
    rooms: [
      { channel: 'ranked',    playlist: 'high-energy',  volume: 0.4 },
      { channel: 'casual',    playlist: 'chill-beats',  volume: 0.3 },
      { channel: 'afk',       playlist: 'ambient',      volume: 0.2 },
    ]
  },

  // Event-Modus: Alle Channels synchronisiert
  event: {
    sync: true,
    rooms: [
      { channel: 'main-stage',   volume: 1.0 },
      { channel: 'backstage',    volume: 0.5 },
      { channel: 'overflow',     volume: 0.8 },
    ],
    playlist: 'event-queue',
  },

  // Party-Modus: DJ in einem Channel, Rest folgt
  party: {
    masterRoom: 'dj-booth',
    relayRooms: ['dance-floor-1', 'dance-floor-2', 'vip-lounge'],
    playlist: 'party-mix',
  },
};
```

**Slash-Command Interface:**

```
/rooms mode gaming       → Aktiviert Gaming-Preset
/rooms create "Chill"    → Erstellt neuen Room
/rooms destroy "Chill"   → Entfernt Room
/rooms list              → Zeigt alle aktiven Rooms
/rooms sync add #channel → Fuegt Channel zur Sync-Gruppe hinzu
/rooms preset save "My Setup" → Speichert aktuelle Konfiguration
```

---

## 3. Audio-Pipeline

### 3.1 Aktuelle Pipeline (Referenz)

Basierend auf deinem bestehenden Code in `src/index.js` (Zeilen 484-531):

```
URL → yt-dlp (bestaudio) → stdout → FFmpeg (-f ogg -acodec libopus -ar 48000 -ac 2) → AudioResource → AudioPlayer → VoiceConnection
```

### 3.2 Erweiterte Multi-Room Pipeline

```
                          ┌──────────────┐
                          │  URL / Query │
                          └──────┬───────┘
                                 │
                          ┌──────▼───────┐
                          │   yt-dlp     │
                          │ (1x decode)  │
                          └──────┬───────┘
                                 │ Raw PCM / Opus
                          ┌──────▼───────┐
                          │ Audio Router  │
                          │ (SharedBuffer)│
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │             │
              ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
              │ FFmpeg A  │ │ FFmpeg B  │ │ FFmpeg C │
              │ Vol: 80%  │ │ Vol: 60%  │ │ Vol: 100%│
              └─────┬────┘ └────┬─────┘ └────┬─────┘
                    │           │             │
              ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
              │ Player A  │ │ Player B  │ │ Player C │
              │ Room:     │ │ Room:     │ │ Room:    │
              │ Lounge    │ │ Gaming    │ │ AFK      │
              └──────────┘ └──────────┘ └──────────┘
```

### 3.3 Audio Decoding (Effiziente Stream-Duplikation)

**Problem:** Fuer synchronisierte Rooms muss derselbe Audio-Stream an mehrere Worker verteilt werden, ohne ihn mehrfach zu downloaden/decodieren.

**Loesung: PassThrough-Stream-Splitter**

```javascript
const { PassThrough } = require('stream');

class AudioSplitter {
  constructor(sourceStream) {
    this.source = sourceStream;
    this.outputs = new Map();
    this.buffer = [];
    this.bufferMaxSize = 1024 * 1024; // 1 MB Rolling Buffer

    this.source.on('data', (chunk) => {
      // Rolling Buffer fuer Spaet-Joiner
      this.buffer.push(chunk);
      const totalSize = this.buffer.reduce((s, c) => s + c.length, 0);
      while (totalSize > this.bufferMaxSize && this.buffer.length > 1) {
        this.buffer.shift();
      }

      // An alle registrierten Outputs weiterleiten
      for (const [id, output] of this.outputs) {
        if (!output.destroyed) {
          output.write(chunk);
        } else {
          this.outputs.delete(id);
        }
      }
    });

    this.source.on('end', () => {
      for (const output of this.outputs.values()) {
        output.end();
      }
    });
  }

  createOutput(roomId) {
    const output = new PassThrough({ highWaterMark: 64 * 1024 });
    this.outputs.set(roomId, output);
    return output;
  }

  removeOutput(roomId) {
    const output = this.outputs.get(roomId);
    if (output) {
      output.end();
      this.outputs.delete(roomId);
    }
  }
}
```

### 3.4 Buffering-Strategien

```
┌─────────────────────────────────────────────────────┐
│                    Buffer Chain                       │
│                                                       │
│  Download        Decode         Playback    Network   │
│  Buffer          Buffer         Buffer      Buffer    │
│  ┌──────┐       ┌──────┐       ┌──────┐   ┌──────┐  │
│  │256 KB│ ───▶  │128 KB│ ───▶  │ 64 KB│──▶│ 20ms │  │
│  │      │       │      │       │      │   │frames│  │
│  └──────┘       └──────┘       └──────┘   └──────┘  │
│                                                       │
│  Strategie:                                           │
│  - Pre-buffer 2s Audio vor Playback-Start            │
│  - Backpressure bei > 80% Fuellstand                 │
│  - Drop-Policy: aelteste Frames bei Ueberlauf        │
└─────────────────────────────────────────────────────┘
```

**Buffer-Konfiguration pro Room-Typ:**

```javascript
const BUFFER_PROFILES = {
  lowLatency: {     // Fuer synchronisierte Rooms
    downloadBuffer: 128 * 1024,   // 128 KB
    decodeBuffer: 64 * 1024,      // 64 KB
    preBufferMs: 500,             // 0.5s Pre-Buffer
    jitterBuffer: 20,             // 20ms (1 Opus Frame)
  },
  balanced: {       // Standard
    downloadBuffer: 256 * 1024,   // 256 KB
    decodeBuffer: 128 * 1024,     // 128 KB
    preBufferMs: 2000,            // 2s Pre-Buffer
    jitterBuffer: 60,             // 60ms (3 Opus Frames)
  },
  resilient: {      // Fuer instabile Verbindungen
    downloadBuffer: 512 * 1024,   // 512 KB
    decodeBuffer: 256 * 1024,     // 256 KB
    preBufferMs: 5000,            // 5s Pre-Buffer
    jitterBuffer: 200,            // 200ms (10 Opus Frames)
  },
};
```

### 3.5 Audio-Routing in mehrere Outputs

**Fuer Individuelle Rooms:** Jeder Worker startet seinen eigenen yt-dlp + FFmpeg Prozess. Einfach, isoliert, aber ressourcenintensiv.

**Fuer Synchronisierte Rooms:** Ein zentraler Decoder, mehrere PassThrough-Streams.

```javascript
// Synchronisierter Playback fuer alle Rooms einer Sync-Gruppe
async function playSynced(syncGroup, trackUrl) {
  // 1. Einmal decodieren
  const ytdlp = spawn('yt-dlp', ['-o', '-', '-f', 'bestaudio', trackUrl]);

  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-f', 's16le',       // Raw PCM (fuer Splitting)
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);

  ytdlp.stdout.pipe(ffmpeg.stdin);

  // 2. Splitter erstellen
  const splitter = new AudioSplitter(ffmpeg.stdout);

  // 3. Fuer jeden Room einen Output + individuellen Encoder
  for (const room of syncGroup.rooms) {
    const pcmStream = splitter.createOutput(room.id);

    // Individueller Opus-Encoder pro Room (fuer Volume-Control)
    const encoder = spawn('ffmpeg', [
      '-f', 's16le', '-ar', '48000', '-ac', '2',
      '-i', 'pipe:0',
      '-af', `volume=${room.volume}`,
      '-f', 'ogg', '-acodec', 'libopus',
      'pipe:1'
    ]);

    pcmStream.pipe(encoder.stdin);

    const resource = createAudioResource(encoder.stdout, {
      inputType: StreamType.OggOpus,
    });

    room.worker.player.play(resource);
  }
}
```

---

## 4. Discord Voice Limitations & Workarounds

### 4.1 Bekannte Limitierungen

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| 1 Voice-Connection pro Guild pro Bot | Blockiert Multi-Room | Multi-Application Workers |
| Voice Server Wechsel (Region Migration) | Kurze Unterbrechung | Auto-Reconnect mit State Recovery |
| Max. Bitrate 384 kbps (Boost Level 3) | Qualitaets-Ceiling | Opus @ 128 kbps ist ausreichend |
| Opus-only Codec | Kein PCM-Streaming | FFmpeg Opus-Encoding Pflicht |
| UDP Transport (kein TCP Fallback) | Paketverlust moeglich | FEC + Jitter Buffer |
| Rate Limits: Voice State Updates | Max ~2/s pro Bot | Batch-Updates, Cooldowns |
| Gateway Reconnects | Connection-Verlust | Stateful Reconnect |

### 4.2 Methoden zur Minimierung von Verzoegerungen

**A) Opus Frame-Size Optimierung:**

```javascript
// Opus Frame-Sizes: 2.5, 5, 10, 20, 40, 60 ms
// Discord Standard: 20 ms → guter Kompromiss
// Low-Latency: 10 ms → weniger Latenz, mehr CPU, mehr Pakete

// In FFmpeg:
const ffmpegArgs = [
  '-f', 'ogg', '-acodec', 'libopus',
  '-frame_duration', '20',   // Standard: 20ms
  '-ar', '48000', '-ac', '2',
  '-b:a', '128k',            // Bitrate
  '-vbr', 'on',              // Variable Bitrate
  '-application', 'audio',   // Optimiert fuer Musik (nicht VoIP)
];
```

**B) Pre-Download / Pre-Encode:**

```javascript
class PreloadManager {
  constructor(cacheDir = '/tmp/audio-cache') {
    this.cache = new Map(); // url → filePath
    this.cacheDir = cacheDir;
  }

  async preload(track) {
    if (this.cache.has(track.url)) return;

    const filePath = path.join(this.cacheDir, `${hash(track.url)}.opus`);

    await new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', ['-o', '-', '-f', 'bestaudio', track.url]);
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'ogg', '-acodec', 'libopus',
        '-ar', '48000', '-ac', '2',
        filePath
      ]);

      ytdlp.stdout.pipe(ffmpeg.stdin);
      ffmpeg.on('close', (code) => code === 0 ? resolve() : reject());
    });

    this.cache.set(track.url, filePath);
  }

  // Automatisch naechsten Track pre-loaden
  async preloadNext(queue) {
    if (queue.tracks.length > 0) {
      await this.preload(queue.tracks[0]);
    }
  }
}
```

**C) Connection Warmup:**

```javascript
// Worker-Bot verbindet sich BEVOR Playback startet
// und sendet stille Frames zum "Aufwaermen" der UDP-Route

async function warmupConnection(connection) {
  const silence = createAudioResource(
    Buffer.from([0xf8, 0xff, 0xfe]), // Opus Silence Frame
    { inputType: StreamType.Opus }
  );
  const player = createAudioPlayer();
  connection.subscribe(player);
  player.play(silence);

  await new Promise(r => setTimeout(r, 500)); // 500ms Warmup
  player.stop();
  return player;
}
```

### 4.3 Verarbeitung von Paketverlust

**Forward Error Correction (FEC):**

Discord's Opus-Implementation unterstuetzt In-Band FEC. Bei aktiviertem FEC enthaelt jedes Paket eine niedrig-aufgeloeste Kopie des vorherigen Frames.

```javascript
// FFmpeg Opus FEC aktivieren:
const ffmpegArgs = [
  '-acodec', 'libopus',
  '-fec', '1',              // In-Band FEC aktivieren
  '-packet_loss', '15',     // Optimiert fuer bis zu 15% Verlust
];
```

**Paketverlust-Erkennung und Recovery:**

```javascript
class PacketLossMonitor {
  constructor(connection) {
    this.connection = connection;
    this.lostPackets = 0;
    this.totalPackets = 0;
    this.history = []; // Letzte 60 Sekunden

    // @discordjs/voice UDP Stats
    setInterval(() => {
      const stats = connection.ping;
      this.history.push({
        timestamp: Date.now(),
        udpPing: stats.udp,
        wssPing: stats.ws,
      });

      // Nur letzte 60 Eintraege behalten
      if (this.history.length > 60) this.history.shift();
    }, 1000);
  }

  getLossRate() {
    return this.totalPackets > 0
      ? (this.lostPackets / this.totalPackets) * 100
      : 0;
  }

  shouldSwitchToResilientMode() {
    return this.getLossRate() > 5; // >5% → Resilient Buffer Profil
  }
}
```

---

## 5. Dashboard-UI

### 5.1 Design-System

Das Dashboard erweitert die bestehende Web-App (`app/src/App.jsx`) um eine Multi-Room-Verwaltung.

**Design-Prinzipien:**
- Dark Theme (konsistent mit Discord)
- Glassmorphism-Elemente fuer aktive Rooms
- Farbkodierung pro Room-Status
- Responsive: Desktop-first, aber Mobile-kompatibel

### 5.2 Room-Uebersicht (Hauptseite)

```
┌─────────────────────────────────────────────────────────────┐
│  SoundStage                               [Gaming Mode ▾]  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │ 🎵 Chill Lounge │  │ 🎮 Gaming Room  │  │  + Neuer  │  │
│  │                  │  │                  │  │   Room    │  │
│  │ ♫ Lo-Fi Dreams  │  │ ♫ Thunderstruck │  │           │  │
│  │ 2:34 / 3:45     │  │ 1:12 / 4:53     │  │           │  │
│  │ ████████░░ 80%  │  │ ██████░░░░ 60%  │  │           │  │
│  │                  │  │                  │  │           │  │
│  │ 👤 4 Listener   │  │ 👤 7 Listener   │  │           │  │
│  │ 📶 23ms         │  │ 📶 31ms         │  │           │  │
│  │                  │  │                  │  │           │  │
│  │ [⏸] [⏭] [🔊]  │  │ [▶] [⏭] [🔊]  │  │           │  │
│  └─────────────────┘  └─────────────────┘  └───────────┘  │
│                                                             │
│  ─── Audio Routing Matrix ──────────────────────────────── │
│                                                             │
│           │ Chill    │ EDM      │ Rock     │ Ambient   │   │
│  ─────────┼──────────┼──────────┼──────────┼───────────│   │
│  Lounge   │ [●]      │ [ ]      │ [ ]      │ [ ]       │   │
│  Gaming   │ [ ]      │ [●]      │ [ ]      │ [ ]       │   │
│  AFK      │ [ ]      │ [ ]      │ [ ]      │ [●]       │   │
│  ─────────┴──────────┴──────────┴──────────┴───────────│   │
│                                                             │
│  ─── Channel Health ─────────────────────────────────────  │
│                                                             │
│  Lounge   ██████████████████████████  23ms  128kbps  ✅    │
│  Gaming   ████████████████████░░░░░░  31ms  128kbps  ✅    │
│  AFK      ████████████████░░░░░░░░░░  45ms   96kbps  ⚠️   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 UI-Komponenten im Detail

**A) Room-Card:**

```
┌──────────────────────────────┐
│  Room Name            [⚙️]   │  ← Settings (Volume, Bitrate, etc.)
│  ──────────────────────────  │
│                              │
│     🎵                       │  ← Album Art (wenn verfuegbar)
│  Song Title                  │
│  Artist Name                 │
│                              │
│  0:42 ━━━━━━━━━░░░░░ 3:21   │  ← Seek-Bar (klickbar)
│                              │
│  [⏮] [⏸ Pause] [⏭]  🔊━━━ │  ← Playback Controls + Volume
│                              │
│  Queue (3 Songs)      [📋]  │  ← Queue-Toggle
│  ├ Next: Song B              │
│  ├ Song C                    │
│  └ Song D                    │
│                              │
│  👤 4 Listener  📶 23ms     │  ← Live-Stats
│  Status: Playing  128kbps   │
└──────────────────────────────┘
```

**B) Audio-Routing-Matrix:**

Interaktive Matrix, in der per Klick eine Playlist einem Channel zugewiesen wird. Drag & Drop fuer Umsortierung.

**C) Channel-Health-Indikatoren:**

| Indikator | Gruen | Gelb | Rot |
|-----------|-------|------|-----|
| Ping | < 30ms | 30-80ms | > 80ms |
| Packet Loss | < 1% | 1-5% | > 5% |
| Buffer Health | > 80% | 40-80% | < 40% |
| Connection | Ready | Reconnecting | Disconnected |

**D) Live-Status jedes Songs:**

Echtzeit-Updates via WebSocket (erweitert bestehende `stateUpdate` Events):

```javascript
// Erweitertes WebSocket-Event fuer Multi-Room
const multiRoomState = {
  type: 'multiRoomUpdate',
  rooms: [
    {
      id: 'room-1',
      channelId: '123456789',
      channelName: 'Chill Lounge',
      status: 'playing',           // playing | paused | idle | error
      currentTrack: {
        title: 'Lo-Fi Dreams',
        artist: 'ChillBeats',
        duration: 225,              // Sekunden
        position: 154,              // Aktuelle Position
        thumbnail: 'https://...',
        requestedBy: 'User#1234',
      },
      queue: [/* ... */],
      volume: 0.8,
      loopMode: 'queue',
      listeners: 4,
      health: {
        ping: 23,
        packetLoss: 0.2,
        bitrate: 128000,
        bufferHealth: 95,
        uptime: 3600,
      },
    },
    // ... weitere Rooms
  ],
  syncGroups: [
    {
      id: 'sync-1',
      name: 'Event Radio',
      rooms: ['room-1', 'room-3'],
      masterRoom: 'room-1',
      drift: { 'room-3': 42 },    // ms Drift
    }
  ],
};
```

### 5.4 React-Komponentenstruktur

```
<MultiRoomDashboard>
  ├── <RoomOverview>
  │   ├── <RoomCard room={room} />          // Pro Room
  │   │   ├── <NowPlaying track={...} />
  │   │   ├── <SeekBar position={...} />
  │   │   ├── <PlaybackControls />
  │   │   ├── <VolumeSlider />
  │   │   └── <MiniQueue tracks={...} />
  │   └── <AddRoomButton />
  │
  ├── <AudioRoutingMatrix>
  │   ├── <MatrixHeader playlists={...} />
  │   └── <MatrixRow channel={...} />       // Pro Channel
  │
  ├── <ChannelHealthPanel>
  │   └── <HealthBar room={room} />         // Pro Room
  │
  ├── <SyncGroupManager>
  │   ├── <SyncGroup group={...} />
  │   └── <DriftIndicator />
  │
  └── <ServerPresetSelector>
      └── <PresetCard preset={...} />
```

---

## 6. Premium / Monetarisierung

### 6.1 Tier-Modell

```
┌───────────────┬──────────────┬───────────────┬────────────────┐
│               │    Free      │   Pro         │   Enterprise   │
│               │              │   4.99€/mo    │   14.99€/mo    │
├───────────────┼──────────────┼───────────────┼────────────────┤
│ Rooms         │ 1            │ 3             │ 10+            │
│ Sync Groups   │ -            │ 1 (2 Rooms)   │ Unbegrenzt     │
│ Presets       │ 1            │ 5             │ Unbegrenzt     │
│ Audio Quality │ 96 kbps      │ 128 kbps      │ 256 kbps       │
│ Queue/Room    │ 25 Songs     │ 100 Songs     │ 500 Songs      │
│ Dashboard     │ Basic        │ Full          │ Full + API     │
│ Auto-DJ       │ -            │ ✓             │ ✓              │
│ Event Mode    │ -            │ -             │ ✓              │
│ Priority      │ -            │ -             │ Dedicated      │
│               │              │               │ Workers        │
└───────────────┴──────────────┴───────────────┴────────────────┘
```

### 6.2 Premium-Features im Detail

**A) Cross-Room Volume Linking:**

```javascript
// Rooms in einer Volume-Gruppe teilen sich einen Master-Fader
class VolumeLink {
  constructor(rooms) {
    this.rooms = rooms;
    this.masterVolume = 1.0;
    this.ratios = new Map(); // Room-spezifische Offsets
  }

  setMasterVolume(vol) {
    this.masterVolume = vol;
    for (const [room, ratio] of this.ratios) {
      room.setVolume(vol * ratio);
    }
  }

  // "Lounge ist immer 50% vom Master, Gaming ist 80%"
  setRatio(room, ratio) {
    this.ratios.set(room, ratio);
    room.setVolume(this.masterVolume * ratio);
  }
}
```

**B) Event Mode mit DJ-Overlays:**

```
┌──────────────────────────────────────────┐
│  🎪 EVENT MODE: Summer Vibes Party       │
│  ──────────────────────────────────────  │
│                                          │
│  DJ: @MaxMaster                          │
│  Naechster Drop in: 0:32                 │
│                                          │
│  [Jingle abspielen]  [Ansage-Mic]        │
│  [Fade to next]      [Cross-Fade: 5s]   │
│                                          │
│  Overlay-Text: "🔥 Summer Vibes 2026"   │
│  Auto-Announce: ✅ (Song-Wechsel)        │
└──────────────────────────────────────────┘
```

Features:
- **Jingle-System:** Vordefinierte Sounds zwischen Songs (Radio-Drops)
- **Crossfade:** Ueberblendung zwischen Tracks (konfigurierbar 0-10s)
- **Auto-Announce:** Bot postet in Text-Channel bei Song-Wechsel
- **DJ-Queue Priority:** DJ-Rolle kann Songs vorziehen
- **Scheduled Playlists:** "Ab 22:00 wechsle zu Party-Playlist"

**C) Auto-DJ mit Genre-Erkennung:**

```javascript
class AutoDJ {
  constructor(room) {
    this.room = room;
    this.genre = room.config.genre;
    this.playedHistory = [];
    this.energyTarget = 0.7; // 0 = chill, 1 = high energy
  }

  async getNextTrack() {
    // Basierend auf Genre + Energie-Level + bisherigem Verlauf
    const query = this.buildSearchQuery();
    const results = await searchYouTube(query);

    // Duplikate vermeiden
    const filtered = results.filter(
      r => !this.playedHistory.includes(r.url)
    );

    return filtered[0];
  }

  buildSearchQuery() {
    const genreMap = {
      chill: ['lofi hip hop', 'chillwave', 'ambient electronic'],
      gaming: ['edm', 'dubstep', 'drum and bass', 'synthwave'],
      party: ['dance pop', 'house music', 'top 40 remix'],
      rock: ['alternative rock', 'indie rock', 'classic rock'],
    };

    const terms = genreMap[this.genre] || ['music'];
    return terms[Math.floor(Math.random() * terms.length)] + ' music mix';
  }
}
```

---

## 7. Technische Architektur

### 7.1 System-Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    Production Setup                       │
│                                                           │
│  ┌──────────────┐        ┌──────────────────────────┐   │
│  │  Main Bot     │ IPC    │  Worker Manager          │   │
│  │  (Commands,   │◄──────►│  (Spawns/manages         │   │
│  │   API, WS)    │        │   worker processes)      │   │
│  └──────┬───────┘        └──────────┬───────────────┘   │
│         │                            │                    │
│         │ HTTP/WS                    │ child_process      │
│         │                            │                    │
│  ┌──────▼───────┐        ┌──────────▼───────────────┐   │
│  │  Dashboard    │        │  Worker Pool              │   │
│  │  (Tauri/Web)  │        │  ┌─────┐ ┌─────┐ ┌─────┐│   │
│  └──────────────┘        │  │ W-1 │ │ W-2 │ │ W-3 ││   │
│                           │  │Token│ │Token│ │Token││   │
│                           │  │  A  │ │  B  │ │  C  ││   │
│                           │  └──┬──┘ └──┬──┘ └──┬──┘│   │
│                           └─────┼───────┼───────┼───┘   │
│                                 │       │       │        │
│                           Discord Voice Connections      │
│                                 │       │       │        │
│                           ┌─────▼───────▼───────▼────┐  │
│                           │    Discord Voice Servers  │  │
│                           └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Inter-Process Communication (IPC)

```javascript
// worker-manager.js
const { fork } = require('child_process');

class WorkerManager {
  constructor(workerTokens) {
    this.workers = new Map();
    this.tokens = workerTokens;
    this.available = [...workerTokens];
  }

  spawnWorker(roomConfig) {
    const token = this.available.shift();
    if (!token) throw new Error('Keine Worker verfuegbar');

    const worker = fork('./src/worker-bot.js', [], {
      env: { ...process.env, WORKER_TOKEN: token },
      serialization: 'advanced', // Structured Clone (schneller als JSON)
    });

    worker.on('message', (msg) => this.handleWorkerMessage(roomConfig.id, msg));
    worker.on('exit', (code) => this.handleWorkerExit(roomConfig.id, code, token));

    // Initialisierung
    worker.send({
      type: 'init',
      guildId: roomConfig.guildId,
      channelId: roomConfig.channelId,
      volume: roomConfig.volume,
    });

    this.workers.set(roomConfig.id, { process: worker, token, config: roomConfig });
    return worker;
  }

  handleWorkerMessage(roomId, msg) {
    switch (msg.type) {
      case 'heartbeat':
        this.updateRoomHealth(roomId, msg.data);
        break;
      case 'trackEnd':
        this.onTrackEnd(roomId);
        break;
      case 'error':
        this.handleWorkerError(roomId, msg.error);
        break;
      case 'stateUpdate':
        // An Dashboard-WebSocket weiterleiten
        this.broadcastState(roomId, msg.state);
        break;
    }
  }

  handleWorkerExit(roomId, exitCode, token) {
    console.error(`Worker ${roomId} exited with code ${exitCode}`);
    this.available.push(token); // Token zurueck in den Pool

    // Auto-Restart wenn unerwartet
    if (exitCode !== 0) {
      const config = this.workers.get(roomId)?.config;
      if (config) {
        setTimeout(() => this.spawnWorker(config), 2000);
      }
    }
    this.workers.delete(roomId);
  }

  // Command an spezifischen Worker senden
  sendToRoom(roomId, command) {
    const worker = this.workers.get(roomId);
    if (worker) {
      worker.process.send(command);
    }
  }

  // An alle Worker einer Sync-Gruppe
  broadcastToSyncGroup(syncGroupId, command) {
    for (const [roomId, worker] of this.workers) {
      if (worker.config.syncGroup === syncGroupId) {
        worker.process.send(command);
      }
    }
  }
}
```

### 7.3 Worker-Bot Implementation

```javascript
// worker-bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType
} = require('@discordjs/voice');
const { spawn } = require('child_process');

class WorkerBot {
  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });
    this.player = createAudioPlayer();
    this.connection = null;
    this.currentTrack = null;
    this.volume = 1.0;

    this.setupPlayerEvents();
  }

  async init(guildId, channelId) {
    await this.client.login(process.env.WORKER_TOKEN);

    await new Promise(resolve => this.client.once('ready', resolve));

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error(`Guild ${guildId} not found`);

    this.connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    this.connection.subscribe(this.player);

    // Heartbeat starten
    setInterval(() => {
      process.send({
        type: 'heartbeat',
        data: {
          state: this.player.state.status,
          currentTrack: this.currentTrack,
          ping: this.connection.ping,
          memory: process.memoryUsage().heapUsed,
        },
      });
    }, 10_000);
  }

  async playTrack(url, seekPosition = 0) {
    const ytdlp = spawn('yt-dlp', [
      '-o', '-', '-f', 'bestaudio/best',
      '--force-ipv4', '--no-warnings',
      url
    ]);

    const ffmpegArgs = [
      '-i', 'pipe:0',
      ...(seekPosition > 0 ? ['-ss', String(seekPosition)] : []),
      '-af', `volume=${this.volume}`,
      '-f', 'ogg', '-acodec', 'libopus',
      '-ar', '48000', '-ac', '2',
      'pipe:1'
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    ytdlp.stdout.pipe(ffmpeg.stdin);

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.OggOpus,
    });

    this.player.play(resource);
    this.currentTrack = url;
  }

  setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      process.send({ type: 'trackEnd' });
    });

    this.player.on('error', (error) => {
      process.send({ type: 'error', error: error.message });
    });
  }

  setVolume(vol) {
    this.volume = vol;
    // Volume-Aenderung erfordert Stream-Neustart oder resource.volume
  }
}

// Main
const worker = new WorkerBot();

process.on('message', async (msg) => {
  switch (msg.type) {
    case 'init':
      await worker.init(msg.guildId, msg.channelId);
      break;
    case 'play':
      await worker.playTrack(msg.url, msg.seekPosition);
      break;
    case 'pause':
      worker.player.pause();
      break;
    case 'resume':
      worker.player.unpause();
      break;
    case 'stop':
      worker.player.stop();
      break;
    case 'volume':
      worker.setVolume(msg.volume);
      break;
    case 'seek':
      await worker.playTrack(worker.currentTrack, msg.position);
      break;
  }
});
```

### 7.4 Sharding-Hinweise

Wenn der Bot auf vielen Servern laeuft (>2500 Guilds), ist Discord-Sharding Pflicht:

```javascript
// shard-manager.js
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./src/index.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto', // Discord bestimmt Anzahl
});

manager.on('shardCreate', shard => {
  console.log(`Shard ${shard.id} gestartet`);

  shard.on('message', msg => {
    if (msg.type === 'requestWorker') {
      // Worker-Zuweisung ueber Shard-Grenzen hinweg
      globalWorkerManager.assignWorker(shard.id, msg.roomConfig);
    }
  });
});

manager.spawn();
```

**Wichtig fuer Multi-Room + Sharding:**

- Worker-Bots sind **unabhaengig** von Shards (eigene Prozesse, eigene Tokens)
- Der WorkerManager laeuft als **separater Prozess**, nicht innerhalb eines Shards
- Kommunikation: Shard → (IPC) → WorkerManager → (IPC) → Worker
- Jeder Shard kennt nur die Rooms seiner zugewiesenen Guilds

---

## 8. Edge Cases

### 8.1 User wechselt zwischen Channels

```javascript
// Im Haupt-Bot: voiceStateUpdate Listener
client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;

  // User hat Channel gewechselt
  if (oldState.channelId !== newState.channelId) {
    const oldRoom = roomManager.getRoomByChannel(oldState.channelId);
    const newRoom = roomManager.getRoomByChannel(newState.channelId);

    // Listener-Count aktualisieren
    if (oldRoom) oldRoom.removeListener(userId);
    if (newRoom) newRoom.addListener(userId);

    // Sync-Gruppe: Seamless Transition
    if (oldRoom?.syncGroup === newRoom?.syncGroup) {
      // Gleiche Sync-Gruppe → User hoert nahtlos weiter
      // Kein Action noetig (beide spielen den gleichen Track)
      console.log(`User ${userId} moved within sync group`);
    }

    // Auto-Pause wenn Room leer
    if (oldRoom && oldRoom.listenerCount === 0) {
      oldRoom.pause();
      oldRoom.scheduleShutdown(5 * 60 * 1000); // 5 Min Auto-Shutdown
    }

    // Auto-Resume wenn User Room betritt
    if (newRoom && newRoom.isPaused && newRoom.listenerCount === 1) {
      newRoom.resume();
      newRoom.cancelShutdown();
    }
  }
});
```

### 8.2 Bot Restart → State Recovery

```javascript
// state-persistence.js
const fs = require('fs');
const STATE_FILE = './data/room-state.json';

class StatePersistence {
  constructor() {
    this.saveInterval = null;
  }

  // Periodisch State speichern (alle 30s)
  startAutoSave(roomManager) {
    this.saveInterval = setInterval(() => {
      this.save(roomManager);
    }, 30_000);
  }

  save(roomManager) {
    const state = {
      timestamp: Date.now(),
      rooms: [],
    };

    for (const [roomId, room] of roomManager.rooms) {
      state.rooms.push({
        id: roomId,
        guildId: room.guildId,
        channelId: room.channelId,
        volume: room.volume,
        loopMode: room.loopMode,
        currentTrack: room.currentTrack ? {
          url: room.currentTrack.url,
          title: room.currentTrack.title,
          position: room.getPlaybackPosition(), // Aktuelle Seek-Position
          duration: room.currentTrack.duration,
        } : null,
        queue: room.queue.map(t => ({
          url: t.url, title: t.title, duration: t.duration, requestedBy: t.requestedBy,
        })),
        syncGroup: room.syncGroup,
        preset: room.preset,
      });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  async restore(roomManager) {
    if (!fs.existsSync(STATE_FILE)) return;

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const age = Date.now() - state.timestamp;

    // State aelter als 10 Minuten → verwerfen
    if (age > 10 * 60 * 1000) {
      console.log('Saved state too old, skipping restore');
      return;
    }

    console.log(`Restoring ${state.rooms.length} rooms from ${age / 1000}s ago`);

    for (const roomState of state.rooms) {
      try {
        const room = await roomManager.createRoom({
          guildId: roomState.guildId,
          channelId: roomState.channelId,
          volume: roomState.volume,
          syncGroup: roomState.syncGroup,
        });

        // Queue wiederherstellen
        room.queue = roomState.queue;
        room.loopMode = roomState.loopMode;

        // Aktuellen Track fortsetzen (mit Positions-Korrektur)
        if (roomState.currentTrack) {
          const resumePosition = roomState.currentTrack.position + (age / 1000);
          if (resumePosition < roomState.currentTrack.duration) {
            await room.play(roomState.currentTrack.url, resumePosition);
          } else {
            // Track waere vorbei → naechsten spielen
            await room.playNext();
          }
        }
      } catch (err) {
        console.error(`Failed to restore room ${roomState.id}:`, err);
      }
    }
  }
}
```

### 8.3 Grosse Server mit 10+ Rooms

**Herausforderungen:**

| Problem | Loesung |
|---------|---------|
| 10+ Worker-Bots noetig | Worker-Pool mit On-Demand Scaling |
| RAM: ~50 MB pro Worker | Worker auf separatem Server (Microservice) |
| CPU: 10x FFmpeg-Prozesse | Shared Audio-Decoding wo moeglich |
| Discord Rate Limits | Request-Queue mit Backoff |
| Server-Administration | Alle Worker muessen Mitglied sein |

**Skalierungs-Architektur fuer 10+ Rooms:**

```
┌────────────────────┐
│  Orchestrator       │
│  (Main Server)      │
│  - Commands         │
│  - API/Dashboard    │
│  - State Management │
└─────────┬──────────┘
          │ TCP/Redis
          │
┌─────────▼──────────────────────────────┐
│  Worker Cluster (separater Server)      │
│                                         │
│  ┌──────────┐  PM2 / Docker Compose     │
│  │ Worker 1 │  ┌──────────┐             │
│  │ Worker 2 │  │ Worker 6 │             │
│  │ Worker 3 │  │ Worker 7 │             │
│  │ Worker 4 │  │ Worker 8 │             │
│  │ Worker 5 │  │ Worker 9 │             │
│  └──────────┘  │ Worker 10│             │
│                └──────────┘             │
│                                         │
│  Shared Resources:                      │
│  - Audio Cache (Disk)                   │
│  - Redis (State Sync)                   │
└─────────────────────────────────────────┘
```

**Redis fuer Cross-Worker State:**

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Room-State in Redis (statt lokaler Map)
class DistributedRoomState {
  async setRoomState(roomId, state) {
    await redis.set(`room:${roomId}`, JSON.stringify(state), 'EX', 3600);
  }

  async getRoomState(roomId) {
    const data = await redis.get(`room:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllRooms(guildId) {
    const keys = await redis.keys(`room:${guildId}:*`);
    const states = await Promise.all(keys.map(k => redis.get(k)));
    return states.map(s => JSON.parse(s));
  }

  // Pub/Sub fuer Echtzeit-Updates
  async publishUpdate(roomId, event) {
    await redis.publish(`room-updates:${roomId}`, JSON.stringify(event));
  }
}
```

---

## 9. Performance-Optimierung

### 9.1 CPU-Kosten

**Baseline (aktueller Bot, 1 Stream):**

| Prozess | CPU-Nutzung | RAM |
|---------|-------------|-----|
| Node.js (Bot) | 2-5% | ~80 MB |
| yt-dlp | 3-8% (burst) | ~30 MB |
| FFmpeg | 5-10% | ~15 MB |
| **Gesamt** | **~10-23%** | **~125 MB** |

**Multi-Room Skalierung (pro zusaetzlichem Room):**

| Prozess | CPU-Nutzung | RAM |
|---------|-------------|-----|
| Worker Node.js | 2-4% | ~60 MB |
| yt-dlp (pro Track) | 3-8% (burst) | ~30 MB |
| FFmpeg (pro Stream) | 5-10% | ~15 MB |
| **Pro Room** | **~10-22%** | **~105 MB** |

**Hochrechnung auf deinem Oracle Cloud Server (4 CPU, 24 GB RAM):**

| Rooms | CPU-Last | RAM-Nutzung | Machbar? |
|-------|----------|-------------|----------|
| 1 | ~10% | ~125 MB | Problemlos |
| 3 | ~30% | ~335 MB | Gut |
| 5 | ~50% | ~545 MB | OK |
| 10 | ~100% | ~1.1 GB | Grenzwertig (CPU) |

### 9.2 Memory Usage Optimierung

```javascript
// 1. Worker nur bei Bedarf starten (Lazy Spawn)
class LazyWorkerPool {
  constructor(tokens) {
    this.tokens = tokens;
    this.active = new Map();   // Laufende Worker
    this.idle = [];             // Bereite, aber pausierte Worker
  }

  async getWorker(roomConfig) {
    // Erst idle Worker pruefen
    if (this.idle.length > 0) {
      const worker = this.idle.pop();
      await worker.reassign(roomConfig);
      this.active.set(roomConfig.id, worker);
      return worker;
    }

    // Neuen Worker spawnen
    const token = this.tokens.find(t =>
      !Array.from(this.active.values()).some(w => w.token === t)
    );
    if (!token) throw new Error('Pool exhausted');

    const worker = await this.spawnWorker(token, roomConfig);
    this.active.set(roomConfig.id, worker);
    return worker;
  }

  // Worker in Idle versetzen statt killen (vermeidet Startup-Kosten)
  async releaseWorker(roomId) {
    const worker = this.active.get(roomId);
    if (worker) {
      worker.stop();
      worker.leaveChannel();
      this.active.delete(roomId);
      this.idle.push(worker);

      // Idle Worker nach 5 Min komplett beenden
      setTimeout(() => {
        const idx = this.idle.indexOf(worker);
        if (idx !== -1) {
          this.idle.splice(idx, 1);
          worker.destroy();
        }
      }, 5 * 60 * 1000);
    }
  }
}
```

```javascript
// 2. Audio-Cache mit LRU-Eviction
class AudioCache {
  constructor(maxSizeMB = 500) {
    this.maxSize = maxSizeMB * 1024 * 1024;
    this.entries = new Map(); // url → { path, size, lastAccess }
    this.currentSize = 0;
  }

  async get(url) {
    const entry = this.entries.get(url);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.path;
    }
    return null;
  }

  async put(url, filePath) {
    const stats = fs.statSync(filePath);
    const size = stats.size;

    // Eviction: aelteste Eintraege entfernen bis Platz da ist
    while (this.currentSize + size > this.maxSize && this.entries.size > 0) {
      const oldest = [...this.entries.entries()]
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
      fs.unlinkSync(oldest[1].path);
      this.currentSize -= oldest[1].size;
      this.entries.delete(oldest[0]);
    }

    this.entries.set(url, { path: filePath, size, lastAccess: Date.now() });
    this.currentSize += size;
  }
}
```

### 9.3 Mehrere Streams ohne Qualitaetsverlust

**Regel:** Jede Transkodierung ist ein Qualitaetsverlust. Minimiere die Anzahl der Encoding-Schritte.

```
SCHLECHT (3x Encoding):
  Source → Decode → PCM → Encode Opus → Decode → Re-Encode (Volume) → Output
                                         ↑ Unnoetig!

GUT (1x Encoding):
  Source → Decode → PCM → Volume Adjust (PCM-Domain) → Encode Opus → Output

OPTIMAL fuer Sync-Rooms (1x Decode, 1x Encode pro Room):
  Source → yt-dlp → FFmpeg (PCM 48kHz)
                        ↓
                   AudioSplitter
                   ↓         ↓         ↓
              FFmpeg A   FFmpeg B   FFmpeg C    (Volume-Anpassung + Opus-Encoding)
              → Room A   → Room B   → Room C
```

**Bitrate-Empfehlungen:**

| Szenario | Bitrate | Qualitaet |
|----------|---------|-----------|
| Hintergrundmusik (AFK) | 64 kbps | Akzeptabel |
| Standard-Playback | 128 kbps | Gut |
| High-Quality | 192 kbps | Sehr gut |
| Maximum (Boost Lvl 3) | 384 kbps | Exzellent |

---

## 10. Bonus: Feature-Branding

### Vorschlag 1: **SoundStage** (Empfohlen)

> *"Dein Server, mehrere Buehnen."*

**Pitch:** SoundStage verwandelt deinen Discord-Server in ein Multi-Room Audio-Erlebnis. Jeder Voice-Channel wird zur eigenen Buehne — synchronisiert oder individuell. Chill Lounge, Gaming Arena, AFK Ambient — alles gleichzeitig, alles unter deiner Kontrolle.

**Warum dieser Name?**
- "Stage" passt zu Discord's eigenem Stage-Channel Konzept
- Suggeriert Professionalitaet und Events
- Leicht merkbar, klar in der Bedeutung

---

### Vorschlag 2: **AudioZones**

> *"Ein Server. Unendlich viele Klangwelten."*

**Pitch:** Mit AudioZones erhaelt jeder Voice-Channel seine eigene musikalische Identitaet. Erstelle Zonen fuer verschiedene Stimmungen — vom fokussierten Arbeitsbereich bis zur Party-Zone. Nahtlos, synchron, kontrollierbar.

---

### Vorschlag 3: **HarmonyLink**

> *"Verbinde jeden Channel. Synchronisiere jeden Beat."*

**Pitch:** HarmonyLink ist die naechste Generation von Server-Audio. Synchronisiere Musik ueber mehrere Channels, erstelle Radio-Streams fuer dein Event, oder lass jeden Raum seine eigene Playlist spielen. Ein Dashboard — alle Rooms im Griff.

---

### Vorschlag 4: **RoomCast**

> *"Broadcast. Multicast. RoomCast."*

**Pitch:** RoomCast bringt Multi-Room Audio zu Discord. Wie ein professionelles PA-System: ein Song, viele Raeume — oder verschiedene Playlists fuer verschiedene Vibes. Das Dashboard zeigt dir alles in Echtzeit.

---

### Vorschlag 5: **SonicGrid**

> *"Dein Audio-Netzwerk. Deine Regeln."*

**Pitch:** SonicGrid gibt dir die Kontrolle ueber ein Netzwerk aus Audio-Streams auf deinem Server. Visualisiere, route und synchronisiere Musik ueber eine intuitive Grid-Oberflaeche. Perfekt fuer Communities, Events und Gaming-Clans.

---

## Anhang: Zusammenfassung der Kernentscheidungen

| Entscheidung | Empfehlung | Begruendung |
|-------------|-----------|-------------|
| Multi-Room Ansatz | Multi-Application Workers | Einzige Moeglichkeit bei Discord's 1-Connection-Limit |
| Sync-Methode | Scheduled Start + Drift-Korrektur | Perfekter Sync ueber UDP nicht moeglich |
| IPC | Node.js child_process (fork) | Einfach, schnell, kein Redis noetig fuer <5 Rooms |
| State Persistence | JSON-File (einfach) / Redis (10+) | Skaliert mit Anforderung |
| Audio-Duplikation | PCM-Splitter → individuelle Encoder | 1x Download, minimaler Qualitaetsverlust |
| Dashboard | Erweiterung der bestehenden Web-App | Nutzt vorhandene Auth + WebSocket Infrastruktur |
| Branding | SoundStage | Professionell, einpraegsam, Discord-nah |

---

*Dokument erstellt: April 2026 | Autor: Feature Design Team*
*Basierend auf: discord-bots/bots/music-bot Codebase-Analyse*

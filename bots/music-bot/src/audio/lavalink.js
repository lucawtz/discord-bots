// Lavalink-v4-Client fuer BeatByte.
//
// Bewusst selbst geschrieben statt shoukaku/lavalink-client: das Protokoll ist
// eine WebSocket-Verbindung plus eine Handvoll REST-Routen, `ws` liegt ohnehin
// schon im Projekt, und die Dockerfiles bauen mit `npm ci` gegen eine
// package-lock.json pro Workspace (siehe CLAUDE.md, "Lockfile-Falle") — jede
// neue Abhaengigkeit ist dort eine Fehlerquelle mehr.
//
// Rollenverteilung, die beim ersten Lesen verwirrt:
//   - Der BOT betritt den Voice-Channel. Nur er hat das Gateway und das Token.
//     Das passiert per OP 4 (Voice State Update) ueber den Shard.
//   - Discord antwortet mit VOICE_STATE_UPDATE (session_id) und
//     VOICE_SERVER_UPDATE (token, endpoint). Diese drei Werte reicht der Bot an
//     LAVALINK weiter, das damit die UDP-Verbindung aufbaut und den Ton sendet.
//   - @discordjs/voice wird auf diesem Pfad NICHT benutzt — es wuerde eine
//     zweite, konkurrierende Voice-Verbindung oeffnen.

const { EventEmitter } = require('events');
const WebSocket = require('ws');

const CLIENT_NAME = 'BeatByte/1.0';

class LavalinkNode extends EventEmitter {
    /**
     * @param {object} opts
     * @param {string} opts.host        Hostname im Compose-Netz (Default: lavalink)
     * @param {number} opts.port        Default 2333
     * @param {string} opts.password    muss zu application.yml passen
     * @param {string} opts.userId      Bot-User-ID (Pflicht-Header beim Handshake)
     * @param {function} opts.sendGateway  (guildId, payload) => void — schickt OP 4
     * @param {object}  [opts.WebSocketImpl]  fuer Tests
     */
    constructor({ host = 'lavalink', port = 2333, password, userId, sendGateway, WebSocketImpl = WebSocket }) {
        super();
        this.host = host;
        this.port = port;
        this.password = password;
        this.userId = userId;
        this.sendGateway = sendGateway;
        this.WebSocketImpl = WebSocketImpl;

        this.rest = `http://${host}:${port}/v4`;
        this.sessionId = null;
        this.connected = false;
        this.players = new Map();   // guildId -> PlayerState
        this._voice = new Map();    // guildId -> { sessionId, token, endpoint }
        this._ws = null;
        this._reconnectAttempt = 0;
        this._closed = false;
    }

    // ── Verbindung ────────────────────────────────────────────────
    connect() {
        this._closed = false;
        const url = `ws://${this.host}:${this.port}/v4/websocket`;
        const headers = {
            Authorization: this.password,
            'User-Id': String(this.userId),
            'Client-Name': CLIENT_NAME,
        };
        // Session-Resumption: Laeuft der Bot neu an, spielt Lavalink weiter und
        // uebergibt uns beim Wiederverbinden die laufenden Player. Genau das
        // macht ein Deploy mitten im Song unauffaellig.
        if (this.sessionId) headers['Session-Id'] = this.sessionId;

        this._ws = new this.WebSocketImpl(url, { headers });

        this._ws.on('open', () => {
            this._reconnectAttempt = 0;
            this.connected = true;
            this.emit('open');
        });

        this._ws.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw.toString()); } catch { return; }
            this._handleMessage(msg);
        });

        this._ws.on('close', (code, reason) => {
            this.connected = false;
            this.emit('close', code, reason?.toString());
            if (!this._closed) this._scheduleReconnect();
        });

        this._ws.on('error', (err) => this.emit('error', err));
        return this;
    }

    _scheduleReconnect() {
        const delay = Math.min(30_000, 2_000 * 2 ** this._reconnectAttempt++);
        this.emit('reconnecting', delay);
        this._reconnectTimer = setTimeout(() => this.connect(), delay);
        this._reconnectTimer.unref?.();
    }

    destroy() {
        this._closed = true;
        clearTimeout(this._reconnectTimer);
        this._ws?.close();
        this.players.clear();
        this._voice.clear();
    }

    _handleMessage(msg) {
        switch (msg.op) {
            case 'ready':
                this.sessionId = msg.sessionId;
                this.emit('ready', { sessionId: msg.sessionId, resumed: !!msg.resumed });
                // Ab jetzt darf Lavalink eine abgerissene Verbindung 60 s lang
                // ueberdauern, ohne die Player wegzuwerfen.
                this._patchSession({ resuming: true, timeout: 60 }).catch(() => {});
                break;
            case 'playerUpdate': {
                const player = this.players.get(msg.guildId);
                if (player) {
                    player.position = msg.state?.position ?? 0;
                    player.connectedToVoice = !!msg.state?.connected;
                    player.ping = msg.state?.ping ?? -1;
                }
                this.emit('playerUpdate', msg.guildId, msg.state);
                break;
            }
            case 'stats':
                this.stats = msg;
                this.emit('stats', msg);
                break;
            case 'event':
                this.emit('trackEvent', msg);
                this.emit(msg.type, msg);
                break;
        }
    }

    // ── REST ──────────────────────────────────────────────────────
    async _request(method, path, body) {
        const res = await fetch(`${this.rest}${path}`, {
            method,
            headers: {
                Authorization: this.password,
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        if (res.status === 204) return null;
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) {
            // Lavalinks Fehlerobjekt hat message, cause und path — ohne die
            // beiden letzten ist "Bad Request" nicht diagnostizierbar.
            const detail = [data?.message, data?.cause, data?.path && `(${method} ${data.path})`]
                .filter(Boolean).join(' — ');
            const err = new Error(detail || `Lavalink ${res.status} bei ${method} ${path}`);
            err.status = res.status;
            err.lavalink = data;
            throw err;
        }
        return data;
    }

    _patchSession(body) {
        return this._request('PATCH', `/sessions/${this.sessionId}`, body);
    }

    /**
     * Sucht oder laedt. identifier z.B. "ytsearch:gzuz g wagon" oder eine URL.
     * Gibt { loadType, tracks[], playlist? } zurueck — loadType ist einer von
     * track | playlist | search | empty | error.
     */
    async loadTracks(identifier) {
        const body = await this._request('GET', `/loadtracks?identifier=${encodeURIComponent(identifier)}`);
        const out = { loadType: body.loadType, tracks: [], playlist: null, error: null };
        switch (body.loadType) {
            case 'track': out.tracks = [body.data]; break;
            case 'search': out.tracks = body.data || []; break;
            case 'playlist':
                out.tracks = body.data?.tracks || [];
                out.playlist = body.data?.info || null;
                break;
            case 'error':
                out.error = body.data?.message || body.data?.cause || 'unbekannter Ladefehler';
                break;
        }
        return out;
    }

    // ── Voice ─────────────────────────────────────────────────────
    // Bot betritt den Channel. selfDeaf, weil ein Musikbot nie zuhoert.
    joinVoice(guildId, channelId) {
        this.sendGateway(guildId, {
            op: 4,
            d: { guild_id: guildId, channel_id: channelId, self_mute: false, self_deaf: true },
        });
    }

    leaveVoice(guildId) {
        this.sendGateway(guildId, {
            op: 4,
            d: { guild_id: guildId, channel_id: null, self_mute: false, self_deaf: true },
        });
        this._voice.delete(guildId);
    }

    // Die beiden Gateway-Events. Erst wenn BEIDE Haelften da sind, kann Lavalink
    // die Verbindung aufbauen — deshalb wird nach jeder Haelfte geprueft.
    handleVoiceState(data) {
        if (String(data.user_id) !== String(this.userId)) return;
        if (!data.channel_id) { this._voice.delete(data.guild_id); return; }
        const v = this._voice.get(data.guild_id) || {};
        v.sessionId = data.session_id;
        // channelId ist in Lavalink 4.2 PFLICHT im Voice-Objekt. Fehlt es, kommt
        // nur ein nacktes "Bad Request" zurueck — die Begruendung steht allein im
        // Server-Log (nachgewiesen am 2026-09-22). Die aeltere v4-Doku nennt das
        // Feld nicht, deshalb ist es ein beliebter Stolperstein.
        v.channelId = String(data.channel_id);
        this._voice.set(data.guild_id, v);
        this._maybeSendVoice(data.guild_id);
    }

    handleVoiceServer(data) {
        const v = this._voice.get(data.guild_id) || {};
        v.token = data.token;
        v.endpoint = data.endpoint;
        this._voice.set(data.guild_id, v);
        this._maybeSendVoice(data.guild_id);
    }

    _maybeSendVoice(guildId) {
        const v = this._voice.get(guildId);
        if (!v?.sessionId || !v?.token || !v?.endpoint || !v?.channelId || !this.sessionId) return;
        this.updatePlayer(guildId, {
            voice: { token: v.token, endpoint: v.endpoint, sessionId: v.sessionId, channelId: v.channelId },
        }).catch(err => this.emit('error', err));
    }

    // ── Player ────────────────────────────────────────────────────
    _player(guildId) {
        if (!this.players.has(guildId)) {
            this.players.set(guildId, { guildId, position: 0, paused: false, volume: 100, connectedToVoice: false, track: null });
        }
        return this.players.get(guildId);
    }

    async updatePlayer(guildId, body, { noReplace = false } = {}) {
        if (!this.sessionId) throw new Error('Lavalink-Session noch nicht bereit');
        const data = await this._request(
            'PATCH',
            `/sessions/${this.sessionId}/players/${guildId}?noReplace=${noReplace}`,
            body,
        );
        const player = this._player(guildId);
        if (data) {
            player.track = data.track || null;
            player.paused = !!data.paused;
            player.volume = data.volume ?? player.volume;
            player.position = data.state?.position ?? player.position;
            player.connectedToVoice = !!data.state?.connected;
        }
        return player;
    }

    play(guildId, encodedTrack, { startTime, volume, paused } = {}) {
        return this.updatePlayer(guildId, {
            track: { encoded: encodedTrack },
            ...(startTime !== undefined ? { position: startTime } : {}),
            ...(volume !== undefined ? { volume } : {}),
            ...(paused !== undefined ? { paused } : {}),
        });
    }

    stop(guildId) { return this.updatePlayer(guildId, { track: { encoded: null } }); }
    pause(guildId, paused = true) { return this.updatePlayer(guildId, { paused }); }
    // Ohne Neuladen: Lavalink haelt die Quelle seekbar und holt per Range-Request
    // ab der Zielstelle — nicht ab Byte 0 wie die FFmpeg-Pipe.
    seek(guildId, positionMs) { return this.updatePlayer(guildId, { position: Math.max(0, Math.round(positionMs)) }); }
    // 0–1000, 100 = normal. Wirkt im laufenden Strom.
    setVolume(guildId, volume) { return this.updatePlayer(guildId, { volume: clamp(volume, 0, 1000) }); }
    setFilters(guildId, filters) { return this.updatePlayer(guildId, { filters }); }

    async destroyPlayer(guildId) {
        this.players.delete(guildId);
        this._voice.delete(guildId);
        if (!this.sessionId) return;
        await this._request('DELETE', `/sessions/${this.sessionId}/players/${guildId}`).catch(() => {});
    }

    async info() { return this._request('GET', '/info'); }

    /**
     * youtube-source zur Laufzeit konfigurieren (poToken, visitorData,
     * refreshToken). Die Route gehoert dem Plugin und liegt auf der WURZEL,
     * nicht unter /v4 — deshalb hier ein eigener Aufruf statt _request().
     * Ohne gueltigen poToken spielt YouTube nur einen Teil des Katalogs.
     */
    async setYoutubeConfig(config) {
        const res = await fetch(`http://${this.host}:${this.port}/youtube`, {
            method: 'POST',
            headers: { Authorization: this.password, 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`youtube-Konfiguration abgelehnt: HTTP ${res.status}${text ? ` — ${text.slice(0, 160)}` : ''}`);
        }
        return true;
    }
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(n)));

// ── Filter-Uebersetzung ──────────────────────────────────────────
// Die heutigen FFmpeg-Ketten aus buildFilterArgs als Lavalink-Filterobjekte.
// Wichtig: diese wirken LIVE im PCM-Pfad vor dem Opus-Encoder — kein Neustart
// des Streams, anders als restartCurrentWithFilter heute.
const EQ_FREQS = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000];
// Die 7 Baender der Web-App auf die 15 Lavalink-Baender abbilden.
const WEBAPP_BAND_TO_LAVALINK = [[0, 1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14]];

function buildFilters({ filter = 'off', volume = 1, eqBands = null } = {}) {
    const out = {};
    // Lautstaerke fuehrt Lavalink separat (0–1000 per setVolume); hier nur die
    // Filterkette selbst, damit beides unabhaengig aenderbar bleibt.
    if (filter === 'custom' && Array.isArray(eqBands) && eqBands.some(v => v !== 0)) {
        const bands = [];
        eqBands.forEach((gainDb, i) => {
            // Lavalink erwartet -0.25..1.0 statt Dezibel.
            const gain = Math.max(-0.25, Math.min(1, gainDb / 20));
            for (const band of (WEBAPP_BAND_TO_LAVALINK[i] || [])) bands.push({ band, gain });
        });
        out.equalizer = bands;
    } else if (filter === 'bassboost') {
        out.equalizer = EQ_FREQS.map((_, band) => ({ band, gain: band <= 2 ? 0.35 : band <= 4 ? 0.2 : 0 }));
    } else if (filter === 'nightcore') {
        out.timescale = { speed: 1.15, pitch: 1.15, rate: 1.0 };
    } else if (filter === 'slowed') {
        out.timescale = { speed: 0.85, pitch: 0.9, rate: 1.0 };
    }
    return out;
}

module.exports = { LavalinkNode, buildFilters, EQ_FREQS };

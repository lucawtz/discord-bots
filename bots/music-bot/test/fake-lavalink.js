// Minimaler Lavalink-v4-Server fuer Tests: echter HTTP- und WebSocket-Server,
// der das Protokoll spricht und jede Anfrage protokolliert. Damit laesst sich
// der Client pruefen, ohne eine JVM zu starten.
const http = require('http');
const { WebSocketServer } = require('ws');

const TRACK = {
    encoded: 'QAAA...fake',
    info: {
        identifier: 'test1', title: 'G Wagon', author: 'Gzuz', length: 152000,
        isStream: false, uri: 'https://www.youtube.com/watch?v=test1', sourceName: 'youtube',
    },
};

async function startFakeLavalink({ password = 'probe' } = {}) {
    const calls = [];     // { method, path, body }
    const sockets = new Set();
    let sessionId = 'sess-1';
    let loadResponse = { loadType: 'search', data: [TRACK] };

    const server = http.createServer((req, res) => {
        const auth = req.headers.authorization;
        if (auth !== password) { res.writeHead(401).end('{}'); return; }

        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const url = new URL(req.url, 'http://x');
            const parsed = body ? JSON.parse(body) : undefined;
            calls.push({ method: req.method, path: url.pathname + url.search, body: parsed });

            res.setHeader('Content-Type', 'application/json');
            if (url.pathname === '/v4/loadtracks') return res.end(JSON.stringify(loadResponse));
            if (url.pathname === '/v4/info') return res.end(JSON.stringify({ version: { semver: '4.2.2' } }));
            if (url.pathname.includes('/players/')) {
                if (req.method === 'DELETE') { res.writeHead(204).end(); return; }
                // So streng wie der echte Server: Lavalink 4.2 verlangt im
                // Voice-Objekt ALLE vier Felder — fehlt channelId, antwortet es
                // mit einem nackten 400. Ein nachgiebiger Fake haette genau
                // diesen Fehler durchgehen lassen (und hat es am 2026-09-22 auch).
                if (parsed?.voice) {
                    const missing = ['token', 'endpoint', 'sessionId', 'channelId']
                        .filter(k => !parsed.voice[k]);
                    if (missing.length) {
                        res.writeHead(400).end(JSON.stringify({
                            status: 400, error: 'Bad Request',
                            message: `Field '${missing[0]}' is required for type 'VoiceState'`,
                        }));
                        return;
                    }
                }
                return res.end(JSON.stringify({
                    guildId: url.pathname.split('/').pop(),
                    track: parsed?.track?.encoded === null ? null : (parsed?.track ? TRACK : null),
                    volume: parsed?.volume ?? 100,
                    paused: parsed?.paused ?? false,
                    state: { position: parsed?.position ?? 0, connected: !!parsed?.voice, ping: 12 },
                    filters: parsed?.filters ?? {},
                }));
            }
            if (url.pathname.startsWith('/v4/sessions/')) return res.end(JSON.stringify({ resuming: true, timeout: 60 }));
            res.writeHead(404).end('{}');
        });
    });

    const wss = new WebSocketServer({ server, path: '/v4/websocket' });
    const handshakes = [];
    wss.on('connection', (ws, req) => {
        handshakes.push({
            auth: req.headers.authorization,
            userId: req.headers['user-id'],
            clientName: req.headers['client-name'],
            resumeSession: req.headers['session-id'] || null,
        });
        sockets.add(ws);
        ws.on('close', () => sockets.delete(ws));
        ws.send(JSON.stringify({
            op: 'ready', resumed: !!req.headers['session-id'], sessionId,
        }));
    });

    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    return {
        port, calls, handshakes,
        setLoadResponse: (r) => { loadResponse = r; },
        setSessionId: (id) => { sessionId = id; },
        // Simuliert ein Event von Lavalink (TrackStartEvent, TrackEndEvent, ...)
        emit: (payload) => { for (const ws of sockets) ws.send(JSON.stringify(payload)); },
        // terminate() statt close(): 1006 ist reserviert und darf nicht gesendet
        // werden — ein harter Abriss ist ohnehin der realistischere Fall.
        dropConnections: () => { for (const ws of sockets) ws.terminate(); },
        find: (needle) => calls.filter(c => c.path.includes(needle)),
        close: async () => {
            for (const ws of sockets) ws.terminate();
            wss.close();
            await new Promise(r => server.close(r));
        },
        TRACK,
    };
}

module.exports = { startFakeLavalink, TRACK };

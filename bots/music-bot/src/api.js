const http = require('http');
const { WebSocketServer } = require('ws');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

function startAPI(ctx, client) {
    const port = process.env.API_PORT || 3001;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        console.error('FEHLER: API_KEY muss in .env gesetzt sein! Bot-API startet ohne Key nicht.');
        process.exit(1);
    }

    // ── Rate Limiting ────────────────────────────────────────────
    function createRateLimiter(maxRequests, windowMs) {
        const hits = new Map();
        setInterval(() => {
            const now = Date.now();
            for (const [ip, timestamps] of hits) {
                const valid = timestamps.filter(t => now - t < windowMs);
                if (valid.length === 0) hits.delete(ip);
                else hits.set(ip, valid);
            }
        }, 60000);
        return (ip) => {
            const now = Date.now();
            const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
            timestamps.push(now);
            hits.set(ip, timestamps);
            return timestamps.length > maxRequests;
        };
    }

    // API: 100 Requests pro Minute, Search: 20 pro Minute
    const isApiLimited = createRateLimiter(100, 60 * 1000);
    const isSearchLimited = createRateLimiter(20, 60 * 1000);

    // CORS: Nur erlaubte Origins (kommagetrennt in .env)
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',').map(o => o.trim()).filter(Boolean);

    function getCorsOrigin(req) {
        const origin = req.headers.origin;
        if (!origin) return null;
        // Tauri Desktop App + konfigurierte Origins
        if (origin === 'tauri://localhost' || origin === 'https://tauri.localhost') return origin;
        if (allowedOrigins.includes(origin)) return origin;
        return null;
    }

    // ── Hilfsfunktionen ──────────────────────────────────────────

    function getGuildState(guildId) {
        const queue = ctx.queues.get(guildId);
        if (!queue) return { guildId, current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 };

        let elapsed = 0;
        if (queue.current && queue._playbackStart) {
            const isPaused = queue.player?.state?.status === ctx.AudioPlayerStatus.Paused;
            if (!isPaused) {
                elapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
            } else {
                elapsed = queue._pausedElapsed || 0;
            }
        }

        return {
            guildId,
            current: queue.current,
            tracks: queue.tracks.map(t => ({ ...t })),
            paused: queue.player?.state?.status === ctx.AudioPlayerStatus.Paused,
            connected: !!queue.connection,
            loopMode: queue.loopMode || 'off',
            volume: Math.round((queue.volume || 1) * 100),
            elapsed,
        };
    }

    function json(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try { resolve(body ? JSON.parse(body) : {}); }
                catch { reject(new Error('Invalid JSON')); }
            });
            req.on('error', reject);
        });
    }

    // ── HTTP Server ──────────────────────────────────────────────

    const server = http.createServer(async (req, res) => {
        // Security Headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '0');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // CORS
        const corsOrigin = getCorsOrigin(req);
        if (corsOrigin) {
            res.setHeader('Access-Control-Allow-Origin', corsOrigin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

        // Routing
        const url = new URL(req.url, `http://localhost:${port}`);
        const urlPath = url.pathname;
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

        // Rate Limiting
        if (urlPath.startsWith('/api/')) {
            // Strengeres Limit fuer Suche (yt-dlp Last)
            if (urlPath === '/api/search' && isSearchLimited(clientIp)) {
                return json(res, { error: 'Zu viele Suchanfragen. Bitte warte kurz.' }, 429);
            }
            if (isApiLimited(clientIp)) {
                return json(res, { error: 'Zu viele Anfragen. Bitte warte kurz.' }, 429);
            }
        }

        // Auth: API-Endpunkte brauchen immer einen gueltigen Key
        // /status und statische Dateien (Web App) sind oeffentlich
        if (urlPath.startsWith('/api/') && req.headers['x-api-key'] !== apiKey) {
            return json(res, { error: 'Ungültiger API-Key' }, 401);
        }
        const method = req.method;

        try {
            // GET /status — Browser-Statusseite
            if (method === 'GET' && urlPath === '/status') {
                const uptime = process.uptime();
                const h = Math.floor(uptime / 3600);
                const m = Math.floor((uptime % 3600) / 60);
                const s = Math.floor(uptime % 60);
                const uptimeStr = `${h}h ${m}m ${s}s`;
                const mem = process.memoryUsage();
                const memMB = (mem.rss / 1024 / 1024).toFixed(1);
                const guilds = client.guilds.cache.size;
                const activeQueues = [...ctx.queues.values()].filter(q => q.current).length;

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BeatByte Status</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#1a1a2e;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh}
  .card{background:#16213e;border-radius:16px;padding:40px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3)}
  h1{font-size:24px;margin-bottom:24px;text-align:center}
  .status{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px;font-size:18px}
  .dot{width:12px;height:12px;border-radius:50%;background:#00e676;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .stat{background:#0f3460;border-radius:12px;padding:16px;text-align:center}
  .stat .value{font-size:28px;font-weight:bold;color:#e94560}
  .stat .label{font-size:12px;color:#999;margin-top:4px}
  .footer{text-align:center;margin-top:24px;font-size:12px;color:#555}
</style>
</head>
<body>
<div class="card">
  <h1>BeatByte</h1>
  <div class="status"><span class="dot"></span> Online</div>
  <div class="grid">
    <div class="stat"><div class="value">${uptimeStr}</div><div class="label">Uptime</div></div>
    <div class="stat"><div class="value">${memMB} MB</div><div class="label">RAM</div></div>
    <div class="stat"><div class="value">${guilds}</div><div class="label">Server</div></div>
    <div class="stat"><div class="value">${activeQueues}</div><div class="label">Aktive Streams</div></div>
  </div>
  <div class="footer">Oracle Cloud &bull; Node ${process.version}</div>
</div>
</body>
</html>`);
            }

            // GET /api/guilds
            if (method === 'GET' && urlPath === '/api/guilds') {
                const guilds = client.guilds.cache.map(g => ({
                    id: g.id, name: g.name, icon: g.iconURL({ size: 128 }),
                }));
                return json(res, guilds);
            }

            // GET /api/search?q=...
            if (method === 'GET' && urlPath === '/api/search') {
                const q = url.searchParams.get('q');
                if (!q) return json(res, { error: 'Query fehlt' }, 400);
                const results = await ctx.searchTracks(q);
                return json(res, results);
            }

            // GET /api/guild/:id/channels — Voice Channels auflisten
            const channelsMatch = urlPath.match(/^\/api\/guild\/(\d+)\/channels$/);
            if (method === 'GET' && channelsMatch) {
                const guild = client.guilds.cache.get(channelsMatch[1]);
                if (!guild) return json(res, { error: 'Server nicht gefunden' }, 404);
                const channels = guild.channels.cache
                    .filter(c => c.isVoiceBased())
                    .map(c => ({ id: c.id, name: c.name, members: c.members.size }))
                    .sort((a, b) => b.members - a.members);
                return json(res, channels);
            }

            // POST /api/guild/:id/join — Voice Channel beitreten
            const joinMatch = urlPath.match(/^\/api\/guild\/(\d+)\/join$/);
            if (method === 'POST' && joinMatch) {
                const { channelId } = await parseBody(req);
                if (!channelId) return json(res, { error: 'channelId fehlt' }, 400);
                await ctx.joinChannel(joinMatch[1], channelId);
                broadcast('stateUpdate', getGuildState(joinMatch[1]));
                return json(res, { ok: true });
            }

            // GET /api/guild/:id/state
            const stateMatch = urlPath.match(/^\/api\/guild\/(\d+)\/state$/);
            if (method === 'GET' && stateMatch) {
                return json(res, getGuildState(stateMatch[1]));
            }

            // POST /api/guild/:id/play
            const playMatch = urlPath.match(/^\/api\/guild\/(\d+)\/play$/);
            if (method === 'POST' && playMatch) {
                const { query } = await parseBody(req);
                if (!query) return json(res, { error: 'Query fehlt' }, 400);

                const queue = ctx.queues.get(playMatch[1]);
                if (!queue || !queue.connection) {
                    return json(res, { error: 'Bot ist nicht verbunden. Nutze /play in Discord.' }, 400);
                }

                const track = await ctx.searchTrack(query);
                track.requestedBy = 'Desktop App';
                queue.tracks.push(track);

                if (!queue.current) ctx.playNext(playMatch[1]);

                broadcast('stateUpdate', getGuildState(playMatch[1]));
                return json(res, { track, position: queue.tracks.length });
            }

            // POST /api/guild/:id/skip
            const skipMatch = urlPath.match(/^\/api\/guild\/(\d+)\/skip$/);
            if (method === 'POST' && skipMatch) {
                const queue = ctx.queues.get(skipMatch[1]);
                if (!queue?.current) return json(res, { error: 'Nichts wird abgespielt' }, 400);

                for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
                queue.processes.clear();
                queue.player.stop();
                return json(res, { ok: true });
            }

            // POST /api/guild/:id/pause
            const pauseMatch = urlPath.match(/^\/api\/guild\/(\d+)\/pause$/);
            if (method === 'POST' && pauseMatch) {
                const queue = ctx.queues.get(pauseMatch[1]);
                if (!queue?.current) return json(res, { error: 'Nichts wird abgespielt' }, 400);

                if (queue.player.state.status === ctx.AudioPlayerStatus.Paused) {
                    queue._playbackStart = Date.now() - (queue._pausedElapsed || 0) * 1000;
                    queue.player.unpause();
                } else {
                    queue._pausedElapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
                    queue.player.pause();
                }

                broadcast('stateUpdate', getGuildState(pauseMatch[1]));
                return json(res, { paused: queue.player.state.status === ctx.AudioPlayerStatus.Paused });
            }

            // POST /api/guild/:id/stop
            const stopMatch = urlPath.match(/^\/api\/guild\/(\d+)\/stop$/);
            if (method === 'POST' && stopMatch) {
                const queue = ctx.queues.get(stopMatch[1]);
                if (!queue?.connection) return json(res, { error: 'Bot ist nicht verbunden' }, 400);

                for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
                queue.processes.clear();
                queue.tracks = [];
                queue.current = null;
                queue.stopped = true;
                if (queue.player) queue.player.stop(true);
                ctx.scheduleLeave(stopMatch[1]);

                broadcast('stateUpdate', getGuildState(stopMatch[1]));
                return json(res, { ok: true });
            }

            // DELETE /api/guild/:id/queue/:index
            const removeMatch = urlPath.match(/^\/api\/guild\/(\d+)\/queue\/(\d+)$/);
            if (method === 'DELETE' && removeMatch) {
                const queue = ctx.queues.get(removeMatch[1]);
                if (!queue) return json(res, { error: 'Keine Queue' }, 400);

                const index = parseInt(removeMatch[2]);
                if (index < 0 || index >= queue.tracks.length) {
                    return json(res, { error: 'Ungültiger Index' }, 400);
                }

                const removed = queue.tracks.splice(index, 1)[0];
                broadcast('stateUpdate', getGuildState(removeMatch[1]));
                return json(res, { removed });
            }

            // POST /api/guild/:id/shuffle
            const shuffleMatch = urlPath.match(/^\/api\/guild\/(\d+)\/shuffle$/);
            if (method === 'POST' && shuffleMatch) {
                const queue = ctx.queues.get(shuffleMatch[1]);
                if (!queue || queue.tracks.length < 2) return json(res, { error: 'Nicht genug Songs' }, 400);
                for (let i = queue.tracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
                }
                broadcast('stateUpdate', getGuildState(shuffleMatch[1]));
                return json(res, { ok: true });
            }

            // POST /api/guild/:id/loop
            const loopMatch = urlPath.match(/^\/api\/guild\/(\d+)\/loop$/);
            if (method === 'POST' && loopMatch) {
                const queue = ctx.queues.get(loopMatch[1]);
                if (!queue) return json(res, { error: 'Keine Queue' }, 400);
                const modes = ['off', 'song', 'queue'];
                const idx = (modes.indexOf(queue.loopMode) + 1) % modes.length;
                queue.loopMode = modes[idx];
                broadcast('stateUpdate', getGuildState(loopMatch[1]));
                return json(res, { loopMode: queue.loopMode });
            }

            // POST /api/guild/:id/volume
            const volumeMatch = urlPath.match(/^\/api\/guild\/(\d+)\/volume$/);
            if (method === 'POST' && volumeMatch) {
                const { volume } = await parseBody(req);
                const queue = ctx.queues.get(volumeMatch[1]);
                if (!queue) return json(res, { error: 'Keine Queue' }, 400);
                const vol = Math.max(0, Math.min(200, parseInt(volume) || 100));
                queue.volume = vol / 100;
                if (queue._resource?.volume) queue._resource.volume.setVolume(queue.volume);
                broadcast('stateUpdate', getGuildState(volumeMatch[1]));
                return json(res, { volume: vol });
            }

            // ── Web App (statische Dateien aus app/dist) ──────────────
            const distDir = path.join(__dirname, '..', 'app', 'dist');
            if (fs.existsSync(distDir)) {
                const mimeTypes = {
                    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
                    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
                    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
                };
                let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);
                if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    filePath = path.join(distDir, 'index.html');
                }
                if (fs.existsSync(filePath)) {
                    const ext = path.extname(filePath);
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    const content = fs.readFileSync(filePath);
                    res.writeHead(200, { 'Content-Type': contentType });
                    return res.end(content);
                }
            }

            // 404
            json(res, { error: 'Not found' }, 404);

        } catch (err) {
            json(res, { error: err.message }, 500);
        }
    });

    // ── WebSocket ────────────────────────────────────────────────

    const wss = new WebSocketServer({ server });

    function broadcast(event, data) {
        const msg = JSON.stringify({ event, data });
        for (const ws of wss.clients) {
            if (ws.readyState === 1) ws.send(msg);
        }
    }

    // ── Start ────────────────────────────────────────────────────

    server.listen(port, () => {
        console.log(`🌐 API Server läuft auf Port ${port}`);
    });

    return { broadcast, getGuildState };
}

module.exports = { startAPI };

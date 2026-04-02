const http = require('http');
const { WebSocketServer } = require('ws');
const { URL } = require('url');

function startAPI(ctx, client) {
    const port = process.env.API_PORT || 3000;
    const apiKey = process.env.API_KEY;

    // ── Hilfsfunktionen ──────────────────────────────────────────

    function getGuildState(guildId) {
        const queue = ctx.queues.get(guildId);
        if (!queue) return { guildId, current: null, tracks: [], paused: false, connected: false };
        return {
            guildId,
            current: queue.current,
            tracks: queue.tracks.map(t => ({ ...t })),
            paused: queue.player?.state?.status === ctx.AudioPlayerStatus.Paused,
            connected: !!queue.connection,
        };
    }

    function json(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

        // Auth
        if (apiKey && req.headers['x-api-key'] !== apiKey) {
            return json(res, { error: 'Ungültiger API-Key' }, 401);
        }

        // Routing
        const url = new URL(req.url, `http://localhost:${port}`);
        const path = url.pathname;
        const method = req.method;

        try {
            // GET /status — Browser-Statusseite
            if (method === 'GET' && path === '/status') {
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
            if (method === 'GET' && path === '/api/guilds') {
                const guilds = client.guilds.cache.map(g => ({
                    id: g.id, name: g.name, icon: g.iconURL({ size: 128 }),
                }));
                return json(res, guilds);
            }

            // GET /api/search?q=...
            if (method === 'GET' && path === '/api/search') {
                const q = url.searchParams.get('q');
                if (!q) return json(res, { error: 'Query fehlt' }, 400);
                const results = await ctx.searchTracks(q);
                return json(res, results);
            }

            // GET /api/guild/:id/channels — Voice Channels auflisten
            const channelsMatch = path.match(/^\/api\/guild\/(\d+)\/channels$/);
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
            const joinMatch = path.match(/^\/api\/guild\/(\d+)\/join$/);
            if (method === 'POST' && joinMatch) {
                const { channelId } = await parseBody(req);
                if (!channelId) return json(res, { error: 'channelId fehlt' }, 400);
                await ctx.joinChannel(joinMatch[1], channelId);
                broadcast('stateUpdate', getGuildState(joinMatch[1]));
                return json(res, { ok: true });
            }

            // GET /api/guild/:id/state
            const stateMatch = path.match(/^\/api\/guild\/(\d+)\/state$/);
            if (method === 'GET' && stateMatch) {
                return json(res, getGuildState(stateMatch[1]));
            }

            // POST /api/guild/:id/play
            const playMatch = path.match(/^\/api\/guild\/(\d+)\/play$/);
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
            const skipMatch = path.match(/^\/api\/guild\/(\d+)\/skip$/);
            if (method === 'POST' && skipMatch) {
                const queue = ctx.queues.get(skipMatch[1]);
                if (!queue?.current) return json(res, { error: 'Nichts wird abgespielt' }, 400);

                for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
                queue.processes.clear();
                queue.player.stop();
                return json(res, { ok: true });
            }

            // POST /api/guild/:id/pause
            const pauseMatch = path.match(/^\/api\/guild\/(\d+)\/pause$/);
            if (method === 'POST' && pauseMatch) {
                const queue = ctx.queues.get(pauseMatch[1]);
                if (!queue?.current) return json(res, { error: 'Nichts wird abgespielt' }, 400);

                if (queue.player.state.status === ctx.AudioPlayerStatus.Paused) {
                    queue.player.unpause();
                } else {
                    queue.player.pause();
                }

                broadcast('stateUpdate', getGuildState(pauseMatch[1]));
                return json(res, { paused: queue.player.state.status === ctx.AudioPlayerStatus.Paused });
            }

            // POST /api/guild/:id/stop
            const stopMatch = path.match(/^\/api\/guild\/(\d+)\/stop$/);
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
            const removeMatch = path.match(/^\/api\/guild\/(\d+)\/queue\/(\d+)$/);
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

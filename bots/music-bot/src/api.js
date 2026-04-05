const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { URL } = require('url');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const { createRateLimiter } = require('../../../libs/rateLimiter');

function startAPI(ctx, client) {
    const port = process.env.API_PORT || 3001;
    const apiKey = process.env.API_KEY || '';

    // ── Rate Limiting ────────────────────────────────────────────
    const isApiLimited = createRateLimiter(100, 60_000);
    const isSearchLimited = createRateLimiter(20, 60_000);
    const isAuthLimited = createRateLimiter(5, 15 * 60_000);

    // ── Access Codes & Sessions ──────────────────────────────────
    const CODE_EXPIRY_MS = 7 * 24 * 60 * 60_000;   // 7 Tage
    const SESSION_EXPIRY_MS = 48 * 60 * 60_000;     // 48 Stunden
    const guildAccessCodes = new Map();  // guildId -> { code, createdAt }
    const sessions = new Map();          // token -> { guildId, createdAt }

    function generateAccessCode(guildId) {
        const existing = guildAccessCodes.get(guildId);
        if (existing && Date.now() - existing.createdAt < CODE_EXPIRY_MS) {
            return existing.code;
        }
        const code = crypto.randomBytes(6).toString('hex').toUpperCase();
        guildAccessCodes.set(guildId, { code, createdAt: Date.now() });
        return code;
    }

    function regenerateAccessCode(guildId) {
        const code = crypto.randomBytes(6).toString('hex').toUpperCase();
        guildAccessCodes.set(guildId, { code, createdAt: Date.now() });
        for (const [token, session] of sessions) {
            if (session.guildId === guildId) sessions.delete(token);
        }
        return code;
    }

    function validateAccessCode(code) {
        const now = Date.now();
        for (const [guildId, entry] of guildAccessCodes) {
            if (entry.code === code.toUpperCase() && now - entry.createdAt < CODE_EXPIRY_MS) {
                return guildId;
            }
        }
        return null;
    }

    function createSession(guildId) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { guildId, createdAt: Date.now() });
        return token;
    }

    function validateSession(token) {
        const session = sessions.get(token);
        if (!session) return null;
        if (Date.now() - session.createdAt > SESSION_EXPIRY_MS) {
            sessions.delete(token);
            return null;
        }
        return session;
    }

    // Cleanup abgelaufener Codes & Sessions
    setInterval(() => {
        const now = Date.now();
        for (const [guildId, entry] of guildAccessCodes) {
            if (now - entry.createdAt > CODE_EXPIRY_MS) guildAccessCodes.delete(guildId);
        }
        for (const [token, session] of sessions) {
            if (now - session.createdAt > SESSION_EXPIRY_MS) sessions.delete(token);
        }
    }, 60_000);

    // ── Auth ─────────────────────────────────────────────────────
    function authenticateRequest(req) {
        if (apiKey && req.headers['x-api-key'] === apiKey) {
            return { type: 'admin', guildId: null };
        }
        const authHeader = req.headers['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
            const session = validateSession(authHeader.slice(7));
            if (session) return { type: 'user', guildId: session.guildId };
        }
        return null;
    }

    function authorizeGuild(auth, guildId) {
        if (!auth) return false;
        if (auth.type === 'admin') return true;
        return auth.guildId === guildId;
    }

    // CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',').map(o => o.trim()).filter(Boolean);

    function getCorsOrigin(req) {
        const origin = req.headers.origin;
        if (!origin) return null;
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
            autoDj: !!queue.autoDj,
        };
    }

    function json(res, data, status = 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    function parseBody(req, maxBytes = 100 * 1024) {
        return new Promise((resolve, reject) => {
            let body = '';
            let size = 0;
            req.on('data', chunk => {
                size += chunk.length;
                if (size > maxBytes) { req.destroy(); return reject(new Error('Body too large')); }
                body += chunk;
            });
            req.on('end', () => {
                try { resolve(body ? JSON.parse(body) : {}); }
                catch { reject(new Error('Invalid JSON')); }
            });
            req.on('error', reject);
        });
    }

    function getClientIp(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    }

    // ── HTTP Server ──────────────────────────────────────────────

    const server = http.createServer(async (req, res) => {
        // Security Headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '0');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // CORS
        const corsOrigin = getCorsOrigin(req);
        if (corsOrigin) {
            res.setHeader('Access-Control-Allow-Origin', corsOrigin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

        const url = new URL(req.url, `http://localhost:${port}`);
        const urlPath = url.pathname;
        const method = req.method;
        const clientIp = getClientIp(req);

        try {
            // ── Oeffentliche Endpunkte ───────────────────────────

            // GET /status
            if (method === 'GET' && urlPath === '/status') {
                const uptime = process.uptime();
                const h = Math.floor(uptime / 3600);
                const m = Math.floor((uptime % 3600) / 60);
                const s = Math.floor(uptime % 60);
                const mem = process.memoryUsage();
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BeatByte Status</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#1a1a2e;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#16213e;border-radius:16px;padding:40px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3)}h1{font-size:24px;margin-bottom:24px;text-align:center}.status{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px;font-size:18px}.dot{width:12px;height:12px;border-radius:50%;background:#00e676;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.stat{background:#0f3460;border-radius:12px;padding:16px;text-align:center}.stat .value{font-size:28px;font-weight:bold;color:#e94560}.stat .label{font-size:12px;color:#999;margin-top:4px}.footer{text-align:center;margin-top:24px;font-size:12px;color:#555}</style></head><body><div class="card"><h1>BeatByte</h1><div class="status"><span class="dot"></span> Online</div><div class="grid"><div class="stat"><div class="value">${h}h ${m}m ${s}s</div><div class="label">Uptime</div></div><div class="stat"><div class="value">${(mem.rss/1024/1024).toFixed(1)} MB</div><div class="label">RAM</div></div><div class="stat"><div class="value">${client.guilds.cache.size}</div><div class="label">Server</div></div><div class="stat"><div class="value">${[...ctx.queues.values()].filter(q=>q.current).length}</div><div class="label">Aktive Streams</div></div></div><div class="footer">Oracle Cloud &bull; Node ${process.version}</div></div></body></html>`);
            }

            // POST /api/auth — Access Code -> Session Token
            if (method === 'POST' && urlPath === '/api/auth') {
                if (isAuthLimited(clientIp)) return json(res, { error: 'Zu viele Versuche. Bitte warte 15 Minuten.' }, 429);
                const { code } = await parseBody(req);
                if (!code) return json(res, { error: 'Code fehlt' }, 400);
                const guildId = validateAccessCode(code);
                if (!guildId) return json(res, { error: 'Ungültiger oder abgelaufener Code. Nutze /app in Discord.' }, 401);
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return json(res, { error: 'Server nicht gefunden' }, 404);
                const token = createSession(guildId);
                return json(res, { token, guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ size: 128 }) } });
            }

            // ── Discord OAuth2 ──────────────────────────────────
            const discordClientId = process.env.CLIENT_ID;
            const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
            const oauthRedirectUri = process.env.OAUTH_REDIRECT_URI || `http://localhost:${port}/api/auth/discord/callback`;

            // GET /api/auth/discord — Redirect to Discord OAuth2
            if (method === 'GET' && urlPath === '/api/auth/discord') {
                if (!discordClientSecret) return json(res, { error: 'Discord OAuth nicht konfiguriert' }, 500);
                const state = crypto.randomBytes(16).toString('hex');
                // Store state for CSRF protection
                sessions.set(`oauth_state_${state}`, { createdAt: Date.now() });
                const params = new URLSearchParams({
                    client_id: discordClientId,
                    redirect_uri: oauthRedirectUri,
                    response_type: 'code',
                    scope: 'identify guilds',
                    state,
                });
                res.writeHead(302, { Location: `https://discord.com/api/oauth2/authorize?${params}` });
                return res.end();
            }

            // GET /api/auth/discord/callback — Handle OAuth2 callback
            if (method === 'GET' && urlPath === '/api/auth/discord/callback') {
                const code = url.searchParams.get('code');
                const state = url.searchParams.get('state');
                const errorParam = url.searchParams.get('error');

                if (errorParam || !code) {
                    res.writeHead(302, { Location: '/?error=discord_denied' });
                    return res.end();
                }

                // Validate CSRF state
                const stateKey = `oauth_state_${state}`;
                if (!state || !sessions.has(stateKey)) {
                    res.writeHead(302, { Location: '/?error=invalid_state' });
                    return res.end();
                }
                sessions.delete(stateKey);

                try {
                    // Exchange code for token
                    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: discordClientId,
                            client_secret: discordClientSecret,
                            grant_type: 'authorization_code',
                            code,
                            redirect_uri: oauthRedirectUri,
                        }),
                    });
                    if (!tokenRes.ok) throw new Error('Token exchange failed');
                    const tokenData = await tokenRes.json();

                    // Get user info
                    const userRes = await fetch('https://discord.com/api/users/@me', {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    });
                    if (!userRes.ok) throw new Error('Failed to fetch user');
                    const user = await userRes.json();

                    // Get user's guilds
                    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    });
                    if (!guildsRes.ok) throw new Error('Failed to fetch guilds');
                    const userGuilds = await guildsRes.json();

                    // Find shared guilds (guilds where the bot is also in)
                    const sharedGuilds = userGuilds
                        .filter(ug => client.guilds.cache.has(ug.id))
                        .map(ug => {
                            const botGuild = client.guilds.cache.get(ug.id);
                            return { id: ug.id, name: botGuild.name, icon: botGuild.iconURL({ size: 128 }) };
                        });

                    if (sharedGuilds.length === 0) {
                        res.writeHead(302, { Location: '/?error=no_shared_guilds' });
                        return res.end();
                    }

                    // Store OAuth data temporarily for guild selection
                    const oauthToken = crypto.randomBytes(32).toString('hex');
                    sessions.set(`oauth_pending_${oauthToken}`, {
                        user: { id: user.id, username: user.username, avatar: user.avatar },
                        guilds: sharedGuilds,
                        createdAt: Date.now(),
                    });

                    // Redirect back to app with token
                    res.writeHead(302, { Location: `/?discord_token=${oauthToken}` });
                    return res.end();
                } catch (err) {
                    console.error('OAuth error:', err.message);
                    res.writeHead(302, { Location: '/?error=oauth_failed' });
                    return res.end();
                }
            }

            // POST /api/auth/discord/guilds — Get shared guilds from OAuth token
            if (method === 'POST' && urlPath === '/api/auth/discord/guilds') {
                const { oauthToken } = await parseBody(req);
                if (!oauthToken) return json(res, { error: 'Token fehlt' }, 400);
                const pending = sessions.get(`oauth_pending_${oauthToken}`);
                if (!pending) return json(res, { error: 'Ungueltiger oder abgelaufener Token' }, 401);
                return json(res, { user: pending.user, guilds: pending.guilds });
            }

            // POST /api/auth/discord/select — Select guild from OAuth
            if (method === 'POST' && urlPath === '/api/auth/discord/select') {
                const { oauthToken, guildId } = await parseBody(req);
                if (!oauthToken || !guildId) return json(res, { error: 'Token und guildId benoetigt' }, 400);
                const pendingKey = `oauth_pending_${oauthToken}`;
                const pending = sessions.get(pendingKey);
                if (!pending) return json(res, { error: 'Ungueltiger oder abgelaufener Token' }, 401);
                const selectedGuild = pending.guilds.find(g => g.id === guildId);
                if (!selectedGuild) return json(res, { error: 'Server nicht verfuegbar' }, 403);
                sessions.delete(pendingKey);
                const sessionToken = createSession(guildId);
                return json(res, { token: sessionToken, guild: selectedGuild });
            }

            // POST /api/auth/verify
            if (method === 'POST' && urlPath === '/api/auth/verify') {
                const auth = authenticateRequest(req);
                if (!auth) return json(res, { valid: false }, 401);
                if (auth.type === 'admin') return json(res, { valid: true, type: 'admin' });
                const guild = client.guilds.cache.get(auth.guildId);
                return json(res, { valid: true, guild: guild ? { id: guild.id, name: guild.name, icon: guild.iconURL({ size: 128 }) } : null });
            }

            // POST /api/auth/logout
            if (method === 'POST' && urlPath === '/api/auth/logout') {
                const authHeader = req.headers['authorization'];
                if (authHeader?.startsWith('Bearer ')) sessions.delete(authHeader.slice(7));
                return json(res, { ok: true });
            }

            // ── Geschuetzte API-Endpunkte ────────────────────────
            if (urlPath.startsWith('/api/')) {
                if (urlPath.includes('/search') && isSearchLimited(clientIp)) return json(res, { error: 'Zu viele Suchanfragen.' }, 429);
                if (isApiLimited(clientIp)) return json(res, { error: 'Zu viele Anfragen.' }, 429);

                const auth = authenticateRequest(req);
                if (!auth) return json(res, { error: 'Nicht authentifiziert. Nutze /app in Discord für einen Zugangs-Code.' }, 401);

                const guildRouteMatch = urlPath.match(/^\/api\/guild\/(\d+)\//);
                if (guildRouteMatch && !authorizeGuild(auth, guildRouteMatch[1])) {
                    return json(res, { error: 'Kein Zugriff auf diesen Server' }, 403);
                }

                // GET /api/guilds
                if (method === 'GET' && urlPath === '/api/guilds') {
                    if (auth.type === 'admin') {
                        return json(res, client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL({ size: 128 }) })));
                    }
                    const guild = client.guilds.cache.get(auth.guildId);
                    return json(res, guild ? [{ id: guild.id, name: guild.name, icon: guild.iconURL({ size: 128 }) }] : []);
                }

                // GET /api/search?q=...
                if (method === 'GET' && urlPath === '/api/search') {
                    const q = url.searchParams.get('q');
                    if (!q) return json(res, { error: 'Query fehlt' }, 400);
                    return json(res, await ctx.searchTracks(q));
                }

                // GET /api/guild/:id/channels
                const channelsMatch = urlPath.match(/^\/api\/guild\/(\d+)\/channels$/);
                if (method === 'GET' && channelsMatch) {
                    const guild = client.guilds.cache.get(channelsMatch[1]);
                    if (!guild) return json(res, { error: 'Server nicht gefunden' }, 404);
                    return json(res, guild.channels.cache.filter(c => c.isVoiceBased()).map(c => ({ id: c.id, name: c.name, members: c.members.size })).sort((a, b) => b.members - a.members));
                }

                // POST /api/guild/:id/join
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
                if (method === 'GET' && stateMatch) return json(res, getGuildState(stateMatch[1]));

                // POST /api/guild/:id/play
                const playMatch = urlPath.match(/^\/api\/guild\/(\d+)\/play$/);
                if (method === 'POST' && playMatch) {
                    const { query } = await parseBody(req);
                    if (!query) return json(res, { error: 'Query fehlt' }, 400);
                    const queue = ctx.queues.get(playMatch[1]);
                    if (!queue || !queue.connection) return json(res, { error: 'Bot ist nicht verbunden. Nutze /play in Discord.' }, 400);
                    const track = await ctx.searchTrack(query);
                    track.requestedBy = 'Web App';
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
                    if (index < 0 || index >= queue.tracks.length) return json(res, { error: 'Ungültiger Index' }, 400);
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
                    queue.loopMode = modes[(modes.indexOf(queue.loopMode) + 1) % modes.length];
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

                // ── Playlist Endpoints ────────────────────────────────

                // GET /api/guild/:id/playlists
                const playlistsListMatch = urlPath.match(/^\/api\/guild\/(\d+)\/playlists$/);
                if (method === 'GET' && playlistsListMatch) {
                    const guildId = playlistsListMatch[1];
                    const playlists = ctx.db.getPlaylists(guildId, null);
                    return json(res, playlists);
                }

                // POST /api/guild/:id/playlists (save current queue)
                if (method === 'POST' && playlistsListMatch) {
                    const guildId = playlistsListMatch[1];
                    const { name } = await parseBody(req);
                    if (!name || name.length > 50) return json(res, { error: 'Name ungueltig (1-50 Zeichen)' }, 400);

                    const queue = ctx.queues.get(guildId);
                    const tracks = [];
                    if (queue?.current) tracks.push(queue.current);
                    if (queue?.tracks) tracks.push(...queue.tracks);
                    if (tracks.length === 0) return json(res, { error: 'Keine Songs zum Speichern' }, 400);
                    if (tracks.length > 200) return json(res, { error: 'Max. 200 Songs pro Playlist' }, 400);

                    const existing = ctx.db.getPlaylistByName(guildId, 'dashboard', name);
                    if (existing) return json(res, { error: 'Playlist-Name existiert bereits' }, 409);

                    try {
                        const id = ctx.db.createPlaylist(guildId, 'dashboard', name, tracks);
                        return json(res, { id, name }, 201);
                    } catch (err) {
                        return json(res, { error: 'Fehler beim Speichern' }, 500);
                    }
                }

                // GET /api/guild/:id/playlists/:pid
                const playlistDetailMatch = urlPath.match(/^\/api\/guild\/(\d+)\/playlists\/(\d+)$/);
                if (method === 'GET' && playlistDetailMatch) {
                    const playlist = ctx.db.getPlaylist(parseInt(playlistDetailMatch[2]));
                    if (!playlist || playlist.guild_id !== playlistDetailMatch[1]) return json(res, { error: 'Nicht gefunden' }, 404);
                    return json(res, playlist);
                }

                // DELETE /api/guild/:id/playlists/:pid
                if (method === 'DELETE' && playlistDetailMatch) {
                    const deleted = ctx.db.deletePlaylist(parseInt(playlistDetailMatch[2]), null);
                    if (!deleted) return json(res, { error: 'Nicht gefunden' }, 404);
                    return json(res, { ok: true });
                }

                // POST /api/guild/:id/playlists/:pid/load
                const playlistLoadMatch = urlPath.match(/^\/api\/guild\/(\d+)\/playlists\/(\d+)\/load$/);
                if (method === 'POST' && playlistLoadMatch) {
                    const guildId = playlistLoadMatch[1];
                    const playlist = ctx.db.getPlaylist(parseInt(playlistLoadMatch[2]));
                    if (!playlist || playlist.guild_id !== guildId) return json(res, { error: 'Nicht gefunden' }, 404);
                    if (playlist.tracks.length === 0) return json(res, { error: 'Playlist ist leer' }, 400);

                    const queue = ctx.getQueue(guildId);
                    const tracks = playlist.tracks.map(t => ({
                        title: t.title,
                        url: t.url,
                        duration: t.duration || '?:??',
                        thumbnail: t.thumbnail || null,
                        artist: t.artist || null,
                        requestedBy: 'Dashboard',
                    }));
                    queue.tracks.push(...tracks);

                    if (queue.connection && !queue.current) {
                        ctx.playNext(guildId);
                    }

                    broadcast('stateUpdate', getGuildState(guildId));
                    return json(res, { ok: true, loaded: tracks.length });
                }

                // ── Auto-DJ Toggle ─────────────────────────────────────

                // POST /api/guild/:id/autodj
                const autoDjMatch = urlPath.match(/^\/api\/guild\/(\d+)\/autodj$/);
                if (method === 'POST' && autoDjMatch) {
                    const guildId = autoDjMatch[1];
                    const queue = ctx.getQueue(guildId);
                    queue.autoDj = !queue.autoDj;
                    ctx.db.setGuildSetting(guildId, 'auto_dj', queue.autoDj ? 1 : 0);
                    broadcast('stateUpdate', getGuildState(guildId));
                    return json(res, { enabled: queue.autoDj });
                }

                // ── Queue Reorder ─────────────────────────────────────

                // POST /api/guild/:id/queue/move
                const queueMoveMatch = urlPath.match(/^\/api\/guild\/(\d+)\/queue\/move$/);
                if (method === 'POST' && queueMoveMatch) {
                    const guildId = queueMoveMatch[1];
                    const { from, to } = await parseBody(req);
                    const queue = ctx.queues.get(guildId);
                    if (!queue) return json(res, { error: 'Keine Queue' }, 400);
                    if (typeof from !== 'number' || typeof to !== 'number') return json(res, { error: 'from und to muessen Zahlen sein' }, 400);
                    if (from < 0 || from >= queue.tracks.length || to < 0 || to >= queue.tracks.length) {
                        return json(res, { error: 'Index ausserhalb der Queue' }, 400);
                    }
                    const [moved] = queue.tracks.splice(from, 1);
                    queue.tracks.splice(to, 0, moved);
                    broadcast('stateUpdate', getGuildState(guildId));
                    return json(res, { ok: true });
                }

                return json(res, { error: 'Not found' }, 404);
            }

            // ── Web App (statische Dateien aus app/dist) ──────────
            const distDir = path.join(__dirname, '..', 'app', 'dist');
            const mimeTypes = {
                '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
                '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
            };
            let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);
            const resolvedDist = path.resolve(distDir);
            if (!path.resolve(filePath).startsWith(resolvedDist + path.sep) && path.resolve(filePath) !== resolvedDist) {
                return json(res, { error: 'Not found' }, 404);
            }
            try {
                const stat = await fsp.stat(filePath);
                if (stat.isDirectory()) filePath = path.join(distDir, 'index.html');
            } catch {
                filePath = path.join(distDir, 'index.html');
            }
            try {
                const content = await fsp.readFile(filePath);
                const ext = path.extname(filePath);
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                return res.end(content);
            } catch { /* dist nicht vorhanden, weiter zu 404 */ }

            json(res, { error: 'Not found' }, 404);
        } catch (err) {
            console.error('API-Fehler:', err);
            json(res, { error: 'Interner Serverfehler' }, 500);
        }
    });

    // ── WebSocket (mit Auth) ─────────────────────────────────────

    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const wsUrl = new URL(req.url, `http://localhost:${port}`);
        const token = wsUrl.searchParams.get('token');
        const key = wsUrl.searchParams.get('key');

        if (key && apiKey && key === apiKey) {
            ws.guildId = null;
            ws.authenticated = true;
        } else if (token) {
            const session = validateSession(token);
            if (session) {
                ws.guildId = session.guildId;
                ws.authenticated = true;
            }
        }

        if (!ws.authenticated) {
            ws._authTimeout = setTimeout(() => {
                if (!ws.authenticated) ws.close(4001, 'Nicht authentifiziert');
            }, 5000);

            ws.on('message', (msg) => {
                try {
                    const data = JSON.parse(msg);
                    if (data.type === 'auth' && data.token) {
                        const session = validateSession(data.token);
                        if (session) {
                            ws.guildId = session.guildId;
                            ws.authenticated = true;
                            clearTimeout(ws._authTimeout);
                            ws.send(JSON.stringify({ event: 'authenticated', data: { guildId: session.guildId } }));
                        } else {
                            ws.close(4001, 'Ungültiger Token');
                        }
                    }
                } catch { /* Ungültiges JSON von WebSocket-Client, ignoriert */ }
            });
        }
    });

    function broadcast(event, data) {
        const msg = JSON.stringify({ event, data });
        for (const ws of wss.clients) {
            if (ws.readyState !== 1 || !ws.authenticated) continue;
            if (ws.guildId === null || ws.guildId === data?.guildId) {
                ws.send(msg);
            }
        }
    }

    // ── Start ────────────────────────────────────────────────────

    server.listen(port, () => {
        console.log(`🌐 API Server läuft auf Port ${port}`);
    });

    // Graceful Shutdown für --watch Restarts
    function shutdown() {
        wss.close();
        server.close();
    }
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    return { broadcast, getGuildState, generateAccessCode, regenerateAccessCode };
}

module.exports = { startAPI };

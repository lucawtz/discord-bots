require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORT = process.env.PORT || 3000;
const DASHBOARD_USER = process.env.DASHBOARD_USER;
const DASHBOARD_PASSWORD_HASH = process.env.DASHBOARD_PASSWORD_HASH;

if (!DASHBOARD_USER || !DASHBOARD_PASSWORD_HASH) {
    console.error('FEHLER: DASHBOARD_USER und DASHBOARD_PASSWORD_HASH muessen in .env gesetzt sein!');
    process.exit(1);
}

// ── Rate Limiting ──────────────────────────────────────────────

const { createRateLimiter } = require('../libs/rateLimiter');

// Login: 5 Versuche pro 15 Minuten
const isLoginLimited = createRateLimiter(5, 15 * 60 * 1000);
// API: 60 Requests pro Minute
const isApiLimited = createRateLimiter(60, 60 * 1000);

// ── Auth ────────────────────────────────────────────────────────

const sessions = new Map();
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

function createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now());
    return token;
}

function isValidSession(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/session=([a-f0-9]+)/);
    if (!match) return false;
    const created = sessions.get(match[1]);
    if (!created) return false;
    if (Date.now() - created > SESSION_MAX_AGE) {
        sessions.delete(match[1]);
        return false;
    }
    return true;
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// ── Hilfsfunktionen ─────────────────────────────────────────────

const allowedServices = config.bots.map(b => b.service);
const VALID_SERVICE_NAME = /^[\w-]+$/;

function validateServiceName(service) {
    if (!VALID_SERVICE_NAME.test(service) || !allowedServices.includes(service)) {
        throw new Error('Ungueltiger Servicename');
    }
}

function getBotStatus(service) {
    validateServiceName(service);
    try {
        const raw = execSync(`systemctl show ${service} --property=ActiveState,SubState,MainPID,ExecMainStartTimestamp,MemoryCurrent 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
        const props = {};
        raw.trim().split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            props[key] = val.join('=');
        });

        const active = props.ActiveState === 'active';
        const pid = parseInt(props.MainPID) || 0;

        let memMB = 0;
        if (props.MemoryCurrent && props.MemoryCurrent !== '[not set]') {
            memMB = (parseInt(props.MemoryCurrent) / 1024 / 1024).toFixed(1);
        }

        let uptime = '';
        if (active && props.ExecMainStartTimestamp) {
            const start = new Date(props.ExecMainStartTimestamp);
            const diff = Date.now() - start.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            uptime = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
        }

        return { running: active, pid, memMB, uptime };
    } catch {
        return { running: false, pid: 0, memMB: 0, uptime: '' };
    }
}

function getBotLogs(service, lines = 50) {
    validateServiceName(service);
    lines = Math.max(1, Math.min(500, parseInt(lines) || 50));
    try {
        return execSync(`journalctl -u ${service} --no-pager -n ${lines} --output=short-iso 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
    } catch {
        return 'Keine Logs verfuegbar';
    }
}

function controlBot(service, action) {
    validateServiceName(service);
    const allowed = ['start', 'stop', 'restart'];
    if (!allowed.includes(action)) throw new Error('Invalid action');
    execSync(`sudo systemctl ${action} ${service}`, { timeout: 15000 });
}

function getSystemInfo() {
    try {
        const loadavg = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(' ');
        const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const totalMatch = meminfo.match(/MemTotal:\s+(\d+)/);
        const availMatch = meminfo.match(/MemAvailable:\s+(\d+)/);
        const totalMB = totalMatch ? (parseInt(totalMatch[1]) / 1024).toFixed(0) : 0;
        const availMB = availMatch ? (parseInt(availMatch[1]) / 1024).toFixed(0) : 0;
        const usedMB = totalMB - availMB;
        const uptime = parseFloat(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0]);
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        return { load: loadavg[0], totalMB, usedMB, availMB, uptime: `${h}h ${m}m` };
    } catch {
        return { load: '?', totalMB: 0, usedMB: 0, availMB: 0, uptime: '?' };
    }
}

function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// ── Login Page ──────────────────────────────────────────────────

const loginHTML = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
const dashboardHTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// ── HTTP Server ─────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;
    const method = req.method;

    try {
        // Login page
        if (method === 'GET' && p === '/login') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(loginHTML);
        }

        // Login POST
        if (method === 'POST' && p === '/login') {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
            if (isLoginLimited(clientIp)) {
                res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '900' });
                return res.end('Zu viele Login-Versuche. Bitte warte 15 Minuten.');
            }

            const body = await parseBody(req);
            const params = new URLSearchParams(body);
            const user = params.get('username');
            const pass = params.get('password');

            if (user === DASHBOARD_USER && await bcrypt.compare(pass, DASHBOARD_PASSWORD_HASH)) {
                const token = createSession();
                res.writeHead(302, {
                    'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
                    'Location': '/'
                });
                return res.end();
            }

            res.writeHead(302, { 'Location': '/login?error=1' });
            return res.end();
        }

        // Logout
        if (method === 'GET' && p === '/logout') {
            const cookie = req.headers.cookie || '';
            const match = cookie.match(/session=([a-f0-9]+)/);
            if (match) sessions.delete(match[1]);
            res.writeHead(302, {
                'Set-Cookie': 'session=; Path=/; HttpOnly; Max-Age=0',
                'Location': '/login'
            });
            return res.end();
        }

        // Alles andere braucht Auth
        if (!isValidSession(req)) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        // Rate Limiting fuer API-Endpunkte
        if (p.startsWith('/api/')) {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
            if (isApiLimited(clientIp)) {
                return json(res, { error: 'Zu viele Anfragen. Bitte warte kurz.' }, 429);
            }
        }

        // Dashboard HTML
        if (method === 'GET' && (p === '/' || p === '/dashboard')) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(dashboardHTML);
        }

        // API: Alle Bots Status
        if (method === 'GET' && p === '/api/bots') {
            const bots = config.bots.map(bot => ({
                ...bot,
                ...getBotStatus(bot.service),
            }));
            const system = getSystemInfo();
            return json(res, { bots, system });
        }

        // API: Bot Logs
        const logsMatch = p.match(/^\/api\/bots\/([\w-]+)\/logs$/);
        if (method === 'GET' && logsMatch) {
            const bot = config.bots.find(b => b.id === logsMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const lines = parseInt(url.searchParams.get('lines')) || 50;
            return json(res, { logs: getBotLogs(bot.service, lines) });
        }

        // API: Bot Control (start/stop/restart)
        const controlMatch = p.match(/^\/api\/bots\/([\w-]+)\/(start|stop|restart)$/);
        if (method === 'POST' && controlMatch) {
            const bot = config.bots.find(b => b.id === controlMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            controlBot(bot.service, controlMatch[2]);
            await new Promise(r => setTimeout(r, 2000));
            return json(res, { ok: true, ...getBotStatus(bot.service) });
        }

        json(res, { error: 'Not found' }, 404);
    } catch (err) {
        console.error('Dashboard-Fehler:', err);
        json(res, { error: 'Interner Serverfehler' }, 500);
    }
});

server.listen(PORT, () => console.log(`Dashboard laeuft auf Port ${PORT}`));

require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORT = process.env.PORT || 3000;

// ── User Management ────────────────────────────────────────────
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function findUserByEmail(email) {
    return loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
    return loadUsers().find(u => u.id === id);
}

// ── Rate Limiting ──────────────────────────────────────────────
const { createRateLimiter } = require('../libs/rateLimiter');
const isLoginLimited = createRateLimiter(5, 15 * 60 * 1000);
const isApiLimited = createRateLimiter(60, 60 * 1000);

// ── Auth ────────────────────────────────────────────────────────
const sessions = new Map(); // token -> { userId, createdAt }
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId, createdAt: Date.now() });
    return token;
}

function getSessionToken(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/session=([a-f0-9]+)/);
    return match ? match[1] : null;
}

function getSessionUser(req) {
    const token = getSessionToken(req);
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
        sessions.delete(token);
        return null;
    }
    const user = findUserById(session.userId);
    if (!user || user.status !== 'active') {
        sessions.delete(token);
        return null;
    }
    return user;
}

function isValidSession(req) {
    return getSessionUser(req) !== null;
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// ── Helpers ─────────────────────────────────────────────────────
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
        const sub = props.SubState || 'dead';
        const pid = parseInt(props.MainPID) || 0;

        let memMB = 0;
        if (props.MemoryCurrent && props.MemoryCurrent !== '[not set]') {
            memMB = (parseInt(props.MemoryCurrent) / 1024 / 1024).toFixed(1);
        }

        let uptime = '';
        let startTime = null;
        if (active && props.ExecMainStartTimestamp) {
            const start = new Date(props.ExecMainStartTimestamp);
            startTime = start.toISOString();
            const diff = Date.now() - start.getTime();
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            uptime = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
        }

        let status = 'stopped';
        if (active) status = 'running';
        else if (sub === 'failed') status = 'crashed';

        return { status, running: active, pid, memMB: parseFloat(memMB), uptime, startTime, restarts: 0 };
    } catch {
        return { status: 'stopped', running: false, pid: 0, memMB: 0, uptime: '', startTime: null, restarts: 0 };
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
        const totalMB = totalMatch ? parseInt(totalMatch[1]) / 1024 : 0;
        const availMB = availMatch ? parseInt(availMatch[1]) / 1024 : 0;
        const usedMB = totalMB - availMB;
        const ramPercent = totalMB > 0 ? ((usedMB / totalMB) * 100).toFixed(1) : 0;

        const cpuLine = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
        const cpuParts = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = cpuParts[3];
        const total = cpuParts.reduce((a, b) => a + b, 0);

        const uptimeRaw = parseFloat(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0]);
        const d = Math.floor(uptimeRaw / 86400);
        const h = Math.floor((uptimeRaw % 86400) / 3600);
        const m = Math.floor((uptimeRaw % 3600) / 60);
        const uptime = d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;

        // Disk usage
        let diskPercent = 0;
        let diskTotal = 0;
        let diskUsed = 0;
        try {
            const df = execSync("df / --output=size,used,pcent | tail -1", { encoding: 'utf8', timeout: 3000 }).trim();
            const parts = df.split(/\s+/);
            diskTotal = Math.round(parseInt(parts[0]) / 1024 / 1024); // GB
            diskUsed = Math.round(parseInt(parts[1]) / 1024 / 1024);
            diskPercent = parseInt(parts[2]);
        } catch {}

        // Network I/O
        let netIn = 0, netOut = 0;
        try {
            const netDev = fs.readFileSync('/proc/net/dev', 'utf8');
            const lines = netDev.trim().split('\n').slice(2);
            for (const line of lines) {
                const p = line.trim().split(/\s+/);
                const iface = p[0].replace(':', '');
                if (iface === 'lo') continue;
                netIn += parseInt(p[1]) || 0;
                netOut += parseInt(p[9]) || 0;
            }
        } catch {}

        return {
            load: loadavg[0],
            load5: loadavg[1],
            load15: loadavg[2],
            totalMB: Math.round(totalMB),
            usedMB: Math.round(usedMB),
            availMB: Math.round(availMB),
            ramPercent: parseFloat(ramPercent),
            cpuIdle: idle,
            cpuTotal: total,
            uptime,
            uptimeSeconds: Math.round(uptimeRaw),
            diskPercent,
            diskTotal,
            diskUsed,
            netIn,
            netOut
        };
    } catch {
        return { load: '?', totalMB: 0, usedMB: 0, availMB: 0, ramPercent: 0, cpuIdle: 0, cpuTotal: 0, uptime: '?', uptimeSeconds: 0, diskPercent: 0, diskTotal: 0, diskUsed: 0, netIn: 0, netOut: 0 };
    }
}

// ── Metrics History (in-memory ring buffer) ─────────────────────
const METRICS_HISTORY_SIZE = 120; // 10 minutes at 5s intervals
const metricsHistory = [];
let lastCpuIdle = 0;
let lastCpuTotal = 0;
let lastNetIn = 0;
let lastNetOut = 0;

function collectMetrics() {
    const sys = getSystemInfo();

    // Calculate CPU percentage from delta
    let cpuPercent = 0;
    if (lastCpuTotal > 0) {
        const idleDelta = sys.cpuIdle - lastCpuIdle;
        const totalDelta = sys.cpuTotal - lastCpuTotal;
        cpuPercent = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
    }
    lastCpuIdle = sys.cpuIdle;
    lastCpuTotal = sys.cpuTotal;

    // Calculate network rate
    let netInRate = 0, netOutRate = 0;
    if (lastNetIn > 0) {
        netInRate = Math.max(0, sys.netIn - lastNetIn) / 5; // bytes/sec (5s interval)
        netOutRate = Math.max(0, sys.netOut - lastNetOut) / 5;
    }
    lastNetIn = sys.netIn;
    lastNetOut = sys.netOut;

    const point = {
        time: Date.now(),
        cpu: cpuPercent,
        ram: sys.ramPercent,
        disk: sys.diskPercent,
        netIn: netInRate,
        netOut: netOutRate,
        load: parseFloat(sys.load) || 0
    };

    metricsHistory.push(point);
    if (metricsHistory.length > METRICS_HISTORY_SIZE) metricsHistory.shift();

    return { ...sys, cpuPercent, netInRate, netOutRate };
}

// Collect metrics every 5 seconds
let latestSystemInfo = collectMetrics();
setInterval(() => { latestSystemInfo = collectMetrics(); }, 5000);

// ── Deployment History (in-memory) ──────────────────────────────
const deploymentHistory = [];

function addDeployment(entry) {
    deploymentHistory.unshift({
        id: crypto.randomBytes(4).toString('hex'),
        time: new Date().toISOString(),
        ...entry
    });
    if (deploymentHistory.length > 100) deploymentHistory.pop();
}

// ── Active Alerts (in-memory) ───────────────────────────────────
const activeAlerts = [];

function checkAlerts() {
    const sys = latestSystemInfo;
    const now = Date.now();

    for (const rule of config.alerts.rules) {
        if (!rule.enabled) continue;

        let value = null;
        if (rule.metric === 'cpu') value = sys.cpuPercent;
        else if (rule.metric === 'ram') value = sys.ramPercent;
        else if (rule.metric === 'disk') value = sys.diskPercent;
        else continue;

        const triggered = rule.operator === 'gt' ? value > rule.threshold : value === rule.threshold;
        const existing = activeAlerts.find(a => a.ruleId === rule.id);

        if (triggered && !existing) {
            activeAlerts.push({
                id: crypto.randomBytes(4).toString('hex'),
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                metric: rule.metric,
                value,
                threshold: rule.threshold,
                triggeredAt: new Date().toISOString(),
                acknowledged: false
            });
        } else if (!triggered && existing) {
            const idx = activeAlerts.indexOf(existing);
            activeAlerts.splice(idx, 1);
        } else if (triggered && existing) {
            existing.value = value;
        }
    }

    // Check bot crashes
    for (const bot of config.bots) {
        const st = getBotStatus(bot.service);
        if (st.status === 'crashed') {
            const existing = activeAlerts.find(a => a.ruleId === `bot-crash-${bot.id}`);
            if (!existing) {
                activeAlerts.push({
                    id: crypto.randomBytes(4).toString('hex'),
                    ruleId: `bot-crash-${bot.id}`,
                    ruleName: `${bot.name} crashed`,
                    severity: 'critical',
                    metric: 'bot_status',
                    value: 'crashed',
                    threshold: 'running',
                    triggeredAt: new Date().toISOString(),
                    acknowledged: false,
                    botId: bot.id
                });
            }
        }
    }
}

setInterval(checkAlerts, 30000);

// ── Static File Serving ─────────────────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff'
};

function serveStatic(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=300' });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
}

function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// ── Password Reset Tokens ───────────────────────────────────────
const resetTokens = new Map(); // token -> { userId, email, createdAt }
const RESET_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 hour

function createResetToken(userId, email) {
    // Remove any existing token for this user
    for (const [t, data] of resetTokens) {
        if (data.userId === userId) resetTokens.delete(t);
    }
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId, email, createdAt: Date.now() });
    return token;
}

function validateResetToken(token) {
    const data = resetTokens.get(token);
    if (!data) return null;
    if (Date.now() - data.createdAt > RESET_TOKEN_MAX_AGE) {
        resetTokens.delete(token);
        return null;
    }
    return data;
}

// Cleanup expired tokens every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [t, data] of resetTokens) {
        if (now - data.createdAt > RESET_TOKEN_MAX_AGE) resetTokens.delete(t);
    }
}, 10 * 60 * 1000);

// ── Login Page ──────────────────────────────────────────────────
const loginHTML = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
const resetPasswordHTML = fs.readFileSync(path.join(__dirname, 'reset-password.html'), 'utf8');
const PUBLIC_DIR = path.join(__dirname, 'public');

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
            const email = (params.get('email') || '').trim().toLowerCase();
            const pass = params.get('password') || '';
            const user = findUserByEmail(email);
            if (user && user.status === 'active' && await bcrypt.compare(pass, user.passwordHash)) {
                const token = createSession(user.id);
                res.writeHead(302, {
                    'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
                    'Location': '/'
                });
                return res.end();
            }
            res.writeHead(302, { 'Location': '/login?error=1' });
            return res.end();
        }

        // Password reset request (from login page)
        if (method === 'POST' && p === '/api/password-reset/request') {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
            if (isLoginLimited(clientIp)) {
                return json(res, { error: 'Zu viele Versuche.' }, 429);
            }
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const email = (data.email || '').trim().toLowerCase();
            // Always return success to prevent email enumeration
            const user = findUserByEmail(email);
            if (user && user.status === 'active') {
                createResetToken(user.id, user.email);
            }
            return json(res, { ok: true, message: 'Falls die E-Mail existiert, wurde eine Anfrage erstellt. Bitte kontaktiere einen Admin.' });
        }

        // Reset password page (GET)
        if (method === 'GET' && p === '/reset-password') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(resetPasswordHTML);
        }

        // Reset password confirm (POST)
        if (method === 'POST' && p === '/api/password-reset/confirm') {
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const { token, password } = data;
            if (!token || !password || password.length < 6) {
                return json(res, { error: 'Token und Passwort (min. 6 Zeichen) erforderlich' }, 400);
            }
            const resetData = validateResetToken(token);
            if (!resetData) {
                return json(res, { error: 'Ungueltiger oder abgelaufener Link' }, 400);
            }
            const users = loadUsers();
            const user = users.find(u => u.id === resetData.userId);
            if (!user) {
                return json(res, { error: 'Benutzer nicht gefunden' }, 404);
            }
            user.passwordHash = await bcrypt.hash(password, 12);
            saveUsers(users);
            resetTokens.delete(token);
            return json(res, { ok: true, message: 'Passwort wurde geaendert. Du kannst dich jetzt anmelden.' });
        }

        // Logout
        if (method === 'GET' && p === '/logout') {
            const token = getSessionToken(req);
            if (token) sessions.delete(token);
            res.writeHead(302, {
                'Set-Cookie': 'session=; Path=/; HttpOnly; Max-Age=0',
                'Location': '/login'
            });
            return res.end();
        }

        // All else requires auth
        if (!isValidSession(req)) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        // Rate limiting for API
        if (p.startsWith('/api/')) {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
            if (isApiLimited(clientIp)) {
                return json(res, { error: 'Zu viele Anfragen.' }, 429);
            }
        }

        // ── API Routes ──────────────────────────────────────────

        // Current user info
        if (method === 'GET' && p === '/api/me') {
            const user = getSessionUser(req);
            if (!user) return json(res, { error: 'Nicht authentifiziert' }, 401);
            return json(res, { id: user.id, name: user.name, email: user.email, role: user.role });
        }

        // List all users (admin only)
        if (method === 'GET' && p === '/api/users') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const users = loadUsers().map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.createdAt }));
            return json(res, { users });
        }

        // Create user (admin only)
        if (method === 'POST' && p === '/api/users') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }

            const { name, email, password, role } = data;
            if (!name || !email || !password) return json(res, { error: 'Name, Email und Passwort erforderlich' }, 400);
            if (!['admin', 'dev', 'support'].includes(role)) return json(res, { error: 'Ungueltige Rolle' }, 400);

            const emailLower = email.trim().toLowerCase();
            const users = loadUsers();
            if (users.find(u => u.email.toLowerCase() === emailLower)) {
                return json(res, { error: 'Email bereits vergeben' }, 409);
            }

            const newUser = {
                id: 'u_' + crypto.randomBytes(6).toString('hex'),
                name: name.trim(),
                email: emailLower,
                passwordHash: await bcrypt.hash(password, 12),
                role,
                status: 'active',
                createdAt: new Date().toISOString()
            };
            users.push(newUser);
            saveUsers(users);
            return json(res, { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status }, 201);
        }

        // Update user (admin only, or self for password)
        const userPatchMatch = p.match(/^\/api\/users\/(u_[\w]+)$/);
        if (method === 'PATCH' && userPatchMatch) {
            const me = getSessionUser(req);
            const targetId = userPatchMatch[1];
            const isSelf = me && me.id === targetId;
            if (!me || (me.role !== 'admin' && !isSelf)) return json(res, { error: 'Keine Berechtigung' }, 403);

            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }

            const users = loadUsers();
            const user = users.find(u => u.id === targetId);
            if (!user) return json(res, { error: 'User nicht gefunden' }, 404);

            // Admin can change everything, self can only change name/password
            if (me.role === 'admin') {
                if (data.name) user.name = data.name.trim();
                if (data.email) {
                    const emailLower = data.email.trim().toLowerCase();
                    if (users.find(u => u.email.toLowerCase() === emailLower && u.id !== targetId)) {
                        return json(res, { error: 'Email bereits vergeben' }, 409);
                    }
                    user.email = emailLower;
                }
                if (data.role && ['admin', 'dev', 'support'].includes(data.role)) user.role = data.role;
                if (data.status && ['active', 'disabled'].includes(data.status)) user.status = data.status;
            } else {
                if (data.name) user.name = data.name.trim();
            }
            if (data.password && data.password.length >= 6) {
                user.passwordHash = await bcrypt.hash(data.password, 12);
            }

            saveUsers(users);
            return json(res, { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
        }

        // Delete user (admin only, cannot delete self)
        const userDeleteMatch = p.match(/^\/api\/users\/(u_[\w]+)$/);
        if (method === 'DELETE' && userDeleteMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const targetId = userDeleteMatch[1];
            if (me.id === targetId) return json(res, { error: 'Eigenen Account kann man nicht loeschen' }, 400);

            const users = loadUsers();
            const idx = users.findIndex(u => u.id === targetId);
            if (idx === -1) return json(res, { error: 'User nicht gefunden' }, 404);
            users.splice(idx, 1);
            saveUsers(users);

            // Invalidate sessions for deleted user
            for (const [token, session] of sessions) {
                if (session.userId === targetId) sessions.delete(token);
            }
            return json(res, { ok: true });
        }

        // List pending password reset requests (admin only)
        if (method === 'GET' && p === '/api/password-resets') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const pending = [];
            for (const [token, data] of resetTokens) {
                const user = findUserById(data.userId);
                pending.push({
                    token,
                    userId: data.userId,
                    email: data.email,
                    userName: user ? user.name : 'Unbekannt',
                    createdAt: new Date(data.createdAt).toISOString(),
                    expiresIn: Math.max(0, Math.round((RESET_TOKEN_MAX_AGE - (Date.now() - data.createdAt)) / 60000))
                });
            }
            return json(res, { resets: pending });
        }

        // Generate reset link for a user (admin only)
        if (method === 'POST' && p === '/api/password-resets/generate') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const user = findUserById(data.userId);
            if (!user) return json(res, { error: 'User nicht gefunden' }, 404);
            const token = createResetToken(user.id, user.email);
            return json(res, { token, userId: user.id, email: user.email });
        }

        // Delete a reset token (admin only)
        const resetDeleteMatch = p.match(/^\/api\/password-resets\/([a-f0-9]+)$/);
        if (method === 'DELETE' && resetDeleteMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            resetTokens.delete(resetDeleteMatch[1]);
            return json(res, { ok: true });
        }

        // Servers list
        if (method === 'GET' && p === '/api/servers') {
            const sys = latestSystemInfo;
            const bots = config.bots.filter(b => b.server === 'oracle-prod-01');
            const botStatuses = bots.map(b => ({ ...b, ...getBotStatus(b.service) }));
            const running = botStatuses.filter(b => b.running).length;
            const crashed = botStatuses.filter(b => b.status === 'crashed').length;

            const servers = config.servers.map(s => ({
                ...s,
                status: 'online',
                cpu: sys.cpuPercent || 0,
                ram: sys.ramPercent || 0,
                disk: sys.diskPercent || 0,
                netIn: sys.netInRate || 0,
                netOut: sys.netOutRate || 0,
                uptime: sys.uptime,
                botsRunning: running,
                botsStopped: bots.length - running - crashed,
                botsCrashed: crashed,
                botsTotal: bots.length
            }));

            return json(res, {
                servers,
                aggregate: {
                    totalServers: servers.length,
                    onlineServers: servers.filter(s => s.status === 'online').length,
                    totalBots: bots.length,
                    runningBots: running,
                    activeAlerts: activeAlerts.length
                }
            });
        }

        // Server detail
        if (method === 'GET' && p.match(/^\/api\/servers\/[\w-]+$/)) {
            const serverId = p.split('/').pop();
            const srv = config.servers.find(s => s.id === serverId);
            if (!srv) return json(res, { error: 'Server nicht gefunden' }, 404);

            const sys = latestSystemInfo;
            const bots = config.bots.filter(b => b.server === serverId).map(b => ({
                ...b,
                ...getBotStatus(b.service)
            }));

            return json(res, {
                ...srv,
                status: 'online',
                system: {
                    cpu: sys.cpuPercent || 0,
                    ram: sys.ramPercent || 0,
                    ramUsed: sys.usedMB,
                    ramTotal: sys.totalMB,
                    disk: sys.diskPercent || 0,
                    diskUsed: sys.diskUsed,
                    diskTotal: sys.diskTotal,
                    load: sys.load,
                    load5: sys.load5,
                    load15: sys.load15,
                    uptime: sys.uptime,
                    uptimeSeconds: sys.uptimeSeconds,
                    netIn: sys.netInRate || 0,
                    netOut: sys.netOutRate || 0
                },
                bots
            });
        }

        // Server metrics history
        if (method === 'GET' && p.match(/^\/api\/servers\/[\w-]+\/metrics$/)) {
            const metricServerId = p.split('/')[3];
            if (!config.servers.find(s => s.id === metricServerId)) {
                return json(res, { error: 'Server nicht gefunden' }, 404);
            }
            return json(res, { metrics: metricsHistory });
        }

        // Server processes
        if (method === 'GET' && p.match(/^\/api\/servers\/[\w-]+\/processes$/)) {
            let processes = [];
            try {
                const raw = execSync("ps aux --sort=-%mem | head -20", { encoding: 'utf8', timeout: 5000 });
                const lines = raw.trim().split('\n').slice(1);
                processes = lines.map(line => {
                    const parts = line.trim().split(/\s+/);
                    return {
                        user: parts[0],
                        pid: parseInt(parts[1]),
                        cpu: parseFloat(parts[2]),
                        mem: parseFloat(parts[3]),
                        vsz: parseInt(parts[4]),
                        rss: parseInt(parts[5]),
                        stat: parts[7],
                        command: parts.slice(10).join(' ')
                    };
                });
            } catch {}
            return json(res, { processes });
        }

        // All bots
        if (method === 'GET' && p === '/api/bots') {
            const bots = config.bots.map(bot => ({
                ...bot,
                ...getBotStatus(bot.service),
            }));
            const system = {
                ...latestSystemInfo,
                cpuPercent: latestSystemInfo.cpuPercent || 0
            };
            return json(res, { bots, system });
        }

        // Bot detail
        if (method === 'GET' && p.match(/^\/api\/bots\/[\w-]+$/)) {
            const botId = p.split('/').pop();
            const bot = config.bots.find(b => b.id === botId);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            return json(res, { ...bot, ...getBotStatus(bot.service) });
        }

        // Bot Logs
        const logsMatch = p.match(/^\/api\/bots\/([\w-]+)\/logs$/);
        if (method === 'GET' && logsMatch) {
            const bot = config.bots.find(b => b.id === logsMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const lines = parseInt(url.searchParams.get('lines')) || 50;
            return json(res, { logs: getBotLogs(bot.service, lines) });
        }

        // Bot Control
        const controlMatch = p.match(/^\/api\/bots\/([\w-]+)\/(start|stop|restart)$/);
        if (method === 'POST' && controlMatch) {
            const bot = config.bots.find(b => b.id === controlMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const action = controlMatch[2];
            controlBot(bot.service, action);

            const actionUser = getSessionUser(req);
            addDeployment({
                type: action,
                bot: bot.name,
                botId: bot.id,
                server: bot.server,
                user: actionUser ? actionUser.name : 'Unknown',
                status: 'success'
            });

            await new Promise(r => setTimeout(r, 2000));
            return json(res, { ok: true, ...getBotStatus(bot.service) });
        }

        // Alerts
        if (method === 'GET' && p === '/api/alerts') {
            return json(res, { alerts: activeAlerts, rules: config.alerts.rules });
        }

        // Acknowledge alert
        if (method === 'POST' && p.match(/^\/api\/alerts\/[\w]+\/acknowledge$/)) {
            const alertId = p.split('/')[3];
            const alert = activeAlerts.find(a => a.id === alertId);
            if (alert) alert.acknowledged = true;
            return json(res, { ok: true });
        }

        // Deployment history
        if (method === 'GET' && p === '/api/deployments') {
            return json(res, { deployments: deploymentHistory });
        }

        // System logs
        if (method === 'GET' && p === '/api/system/logs') {
            const lines = parseInt(url.searchParams.get('lines')) || 50;
            let logs = '';
            try {
                logs = execSync(`journalctl --no-pager -n ${Math.min(lines, 200)} --output=short-iso 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
            } catch { logs = 'Keine Logs verfuegbar'; }
            return json(res, { logs });
        }

        // Network info
        if (method === 'GET' && p.match(/^\/api\/servers\/[\w-]+\/network$/)) {
            let ports = [];
            try {
                const raw = execSync("ss -tlnp 2>/dev/null | tail -n +2", { encoding: 'utf8', timeout: 5000 });
                ports = raw.trim().split('\n').filter(Boolean).map(line => {
                    const parts = line.trim().split(/\s+/);
                    const local = parts[3] || '';
                    const portMatch = local.match(/:(\d+)$/);
                    const processMatch = (parts[5] || '').match(/\"([^"]+)\"/);
                    return {
                        port: portMatch ? parseInt(portMatch[1]) : 0,
                        address: local.replace(/:(\d+)$/, ''),
                        state: parts[0],
                        process: processMatch ? processMatch[1] : '-'
                    };
                });
            } catch {}
            return json(res, { ports });
        }

        // ── Static Files / SPA ──────────────────────────────────

        // Serve static files from public/
        if (method === 'GET') {
            const filePath = path.resolve(PUBLIC_DIR, '.' + path.normalize(p));

            // Prevent path traversal: resolved path must be within PUBLIC_DIR
            if (!filePath.startsWith(PUBLIC_DIR)) {
                res.writeHead(403);
                return res.end('Forbidden');
            }

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return serveStatic(res, filePath);
            }

            // SPA fallback: serve index.html for all non-API routes
            return serveStatic(res, path.join(PUBLIC_DIR, 'index.html'));
        }

        json(res, { error: 'Not found' }, 404);
    } catch (err) {
        console.error('Dashboard-Fehler:', err);
        json(res, { error: 'Interner Serverfehler' }, 500);
    }
});

server.listen(PORT, () => console.log(`Dashboard laeuft auf Port ${PORT}`));

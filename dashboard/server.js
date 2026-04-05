require('dotenv').config();
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { execSync, execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Client: SSHClient } = require('ssh2');
const { TOTP, Secret } = require('otpauth');
const QRCode = require('qrcode');

const IS_WINDOWS = process.platform === 'win32';
let config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function saveConfig() {
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
}
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

// ── Auth ────────���──────────────────────────────────��────────────
const sessions = new Map(); // token -> { userId, createdAt }
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

// Cleanup abgelaufener Sessions alle 10 Minuten
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
        if (now - session.createdAt > SESSION_MAX_AGE) sessions.delete(token);
    }
}, 10 * 60 * 1000);

function invalidateUserSessions(userId, exceptToken = null) {
    for (const [token, session] of sessions) {
        if (session.userId === userId && token !== exceptToken) sessions.delete(token);
    }
}

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
    // Sessions with pending 2FA are not fully authenticated
    if (session.pending2FA) return null;
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

function parseBody(req, maxBytes = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxBytes) { req.destroy(); return reject(new Error('Body too large')); }
            body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// ── TOTP 2FA Helpers ───────────────────────────────────────────
function createTOTP(secret, email) {
    return new TOTP({
        issuer: 'ServerHub',
        label: email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
    });
}

function verifyTOTP(secret, code) {
    const totp = new TOTP({
        issuer: 'ServerHub',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret)
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
}

// ── Helpers ─────────────────────────────────────────────────────
const allowedServices = config.bots.map(b => b.service);
const VALID_SERVICE_NAME = /^[\w-]+$/;

function validateServiceName(service) {
    if (!VALID_SERVICE_NAME.test(service) || !allowedServices.includes(service)) {
        throw new Error('Ungueltiger Servicename');
    }
}

async function getBotStatus(service) {
    validateServiceName(service);
    try {
        const { stdout: raw } = await execFileAsync('systemctl', ['show', service, '--property=ActiveState,SubState,MainPID,ExecMainStartTimestamp,MemoryCurrent'], { encoding: 'utf8', timeout: 5000 });
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

async function getBotLogs(service, lines = 50) {
    validateServiceName(service);
    lines = Math.max(1, Math.min(500, parseInt(lines) || 50));
    try {
        const { stdout } = await execFileAsync('journalctl', ['-u', service, '--no-pager', '-n', String(lines), '--output=short-iso'], { encoding: 'utf8', timeout: 5000 });
        return stdout;
    } catch {
        return 'Keine Logs verfuegbar';
    }
}

async function controlBot(service, action) {
    validateServiceName(service);
    const allowed = ['start', 'stop', 'restart'];
    if (!allowed.includes(action)) throw new Error('Invalid action');
    await execFileAsync('sudo', ['systemctl', action, service], { timeout: 15000 });
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

async function checkAlerts() {
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
            const newAlert = {
                id: crypto.randomBytes(4).toString('hex'),
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                metric: rule.metric,
                value,
                threshold: rule.threshold,
                triggeredAt: new Date().toISOString(),
                acknowledged: false
            };
            activeAlerts.push(newAlert);
            sendWebhook(
                `Alert: ${rule.name}`,
                `${rule.metric} ist ${value} (Schwellwert: ${rule.threshold})`,
                rule.severity === 'critical' ? 0xff0000 : 0xffa500
            );
        } else if (!triggered && existing) {
            const idx = activeAlerts.indexOf(existing);
            activeAlerts.splice(idx, 1);
        } else if (triggered && existing) {
            existing.value = value;
        }
    }

    // Check bot crashes
    for (const bot of config.bots) {
        const st = await getBotStatus(bot.service);
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
                sendWebhook(
                    `Bot Crash: ${bot.name}`,
                    `${bot.name} (${bot.service}) ist abgestuerzt!`,
                    0xff0000
                );
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

// ── Audit Log ──────────────────────────────────────────────────
const AUDIT_LOG_FILE = path.join(__dirname, 'audit.json');
const AUDIT_MAX_ENTRIES = 500;

function loadAuditLog() {
    try {
        return JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveAuditLog(entries) {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function addAuditEntry(user, action, target, details = '') {
    const entries = loadAuditLog();
    entries.unshift({
        id: crypto.randomBytes(4).toString('hex'),
        time: new Date().toISOString(),
        user: user || 'system',
        action,
        target,
        details
    });
    if (entries.length > AUDIT_MAX_ENTRIES) entries.length = AUDIT_MAX_ENTRIES;
    saveAuditLog(entries);
}

// ── Metrics Persistence ────────────────────────────────────────
const METRICS_HISTORY_FILE = path.join(__dirname, 'metrics-history.json');
const METRICS_HISTORY_MAX = 288; // 24h at 5min intervals
let persistedMetricsHistory = [];

function loadMetricsHistory() {
    try {
        persistedMetricsHistory = JSON.parse(fs.readFileSync(METRICS_HISTORY_FILE, 'utf8'));
    } catch {
        persistedMetricsHistory = [];
    }
}

function saveMetricsHistory() {
    try {
        fs.writeFileSync(METRICS_HISTORY_FILE, JSON.stringify(persistedMetricsHistory), 'utf8');
    } catch (err) {
        console.error('Fehler beim Speichern der Metriken:', err.message);
    }
}

loadMetricsHistory();

// Persist metrics every 5 minutes
setInterval(() => {
    if (metricsHistory.length > 0) {
        const latest = metricsHistory[metricsHistory.length - 1];
        persistedMetricsHistory.push(latest);
        if (persistedMetricsHistory.length > METRICS_HISTORY_MAX) {
            persistedMetricsHistory = persistedMetricsHistory.slice(-METRICS_HISTORY_MAX);
        }
        saveMetricsHistory();
    }
}, 5 * 60 * 1000);

// ── Uptime Monitoring ──────────────────────────────────────────
const uptimeResults = {}; // host -> [{time, latency, status}]
const UPTIME_HISTORY_SIZE = 60;

async function checkUptimeTarget(host) {
    // Hostname-Validierung gegen Command Injection
    if (!/^[\w.-]+$/.test(host)) {
        return { time: Date.now(), latency: 0, status: 'down' };
    }
    try {
        const args = IS_WINDOWS
            ? ['-n', '1', '-w', '2000', host]
            : ['-c', '1', '-W', '2', host];
        const start = Date.now();
        const { stdout: output } = await execFileAsync('ping', args, { encoding: 'utf8', timeout: 5000 });
        const latency = Date.now() - start;
        // Try to parse actual latency from ping output
        let parsedLatency = latency;
        const latMatch = output.match(/time[=<](\d+(?:\.\d+)?)\s*ms/i);
        if (latMatch) parsedLatency = parseFloat(latMatch[1]);
        return { time: Date.now(), latency: parsedLatency, status: 'up' };
    } catch {
        return { time: Date.now(), latency: 0, status: 'down' };
    }
}

async function runUptimeChecks() {
    const targets = (config.uptime && config.uptime.targets) || [];
    for (const target of targets) {
        if (!uptimeResults[target.host]) uptimeResults[target.host] = [];
        const result = await checkUptimeTarget(target.host);
        uptimeResults[target.host].push(result);
        if (uptimeResults[target.host].length > UPTIME_HISTORY_SIZE) {
            uptimeResults[target.host].shift();
        }
    }
}

const uptimeInterval = (config.uptime && config.uptime.interval) || 60;
setInterval(runUptimeChecks, uptimeInterval * 1000);
// Initial check after 5 seconds
setTimeout(runUptimeChecks, 5000);

// ── Discord Webhook ────────────────────────────────────────────
function sendWebhook(title, description, color = 0xff0000) {
    if (!config.webhook || !config.webhook.enabled || !config.webhook.url) return;
    try {
        const webhookUrl = new URL(config.webhook.url);
        const payload = JSON.stringify({
            embeds: [{
                title,
                description,
                color,
                timestamp: new Date().toISOString()
            }]
        });
        const options = {
            hostname: webhookUrl.hostname,
            port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
            path: webhookUrl.pathname + webhookUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const mod = webhookUrl.protocol === 'https:' ? https : http;
        const req = mod.request(options, (resp) => {
            resp.resume(); // drain response
        });
        req.on('error', (err) => console.error('Webhook-Fehler:', err.message));
        req.write(payload);
        req.end();
    } catch (err) {
        console.error('Webhook-Fehler:', err.message);
    }
}

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
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com; connect-src 'self' wss://dashboard.bytebots.de; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

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
            const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress;
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
                const token = crypto.randomBytes(32).toString('hex');
                if (user.totpSecret) {
                    // User has 2FA enabled - create pending session
                    sessions.set(token, { userId: user.id, createdAt: Date.now(), pending2FA: true });
                    res.writeHead(302, {
                        'Set-Cookie': `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
                        'Location': '/login?2fa=1'
                    });
                } else {
                    // No 2FA - create normal session
                    sessions.set(token, { userId: user.id, createdAt: Date.now() });
                    res.writeHead(302, {
                        'Set-Cookie': `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
                        'Location': '/'
                    });
                }
                return res.end();
            }
            res.writeHead(302, { 'Location': '/login?error=1' });
            return res.end();
        }

        // Password reset request (from login page)
        if (method === 'POST' && p === '/api/password-reset/request') {
            const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress;
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
            if (!token || !password || password.length < 8) {
                return json(res, { error: 'Token und Passwort (min. 8 Zeichen) erforderlich' }, 400);
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
            invalidateUserSessions(user.id);
            return json(res, { ok: true, message: 'Passwort wurde geaendert. Du kannst dich jetzt anmelden.' });
        }

        // Logout
        if (method === 'GET' && p === '/logout') {
            const token = getSessionToken(req);
            if (token) sessions.delete(token);
            res.writeHead(302, {
                'Set-Cookie': 'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
                'Location': '/login'
            });
            return res.end();
        }

        // 2FA verify during login (before auth check - session is pending)
        if (method === 'POST' && p === '/api/2fa/verify-login') {
            const token = getSessionToken(req);
            if (!token) return json(res, { error: 'Keine Session' }, 401);
            const session = sessions.get(token);
            if (!session || !session.pending2FA) return json(res, { error: 'Keine 2FA-Verifizierung ausstehend' }, 400);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const code = (data.code || '').trim();
            if (!code) return json(res, { error: 'Code erforderlich' }, 400);
            const user = findUserById(session.userId);
            if (!user || !user.totpSecret) {
                sessions.delete(token);
                return json(res, { error: 'Benutzer nicht gefunden' }, 400);
            }
            if (verifyTOTP(user.totpSecret, code)) {
                session.pending2FA = false;
                return json(res, { ok: true });
            }
            return json(res, { error: 'Ungueltiger Code' }, 401);
        }

        // All else requires auth
        if (!isValidSession(req)) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        // Rate limiting for API
        if (p.startsWith('/api/')) {
            const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress;
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

        // ── 2FA Routes (require auth) ──────────────────────────────
        if (method === 'GET' && p === '/api/2fa/status') {
            const user = getSessionUser(req);
            if (!user) return json(res, { error: 'Nicht authentifiziert' }, 401);
            return json(res, { enabled: !!user.totpSecret });
        }

        if (method === 'POST' && p === '/api/2fa/setup') {
            const user = getSessionUser(req);
            if (!user) return json(res, { error: 'Nicht authentifiziert' }, 401);
            const secret = new Secret();
            const totp = createTOTP(secret, user.email);
            const qrCode = await QRCode.toDataURL(totp.toString());
            const base32Secret = secret.base32;
            // Store secret temporarily in session
            const token = getSessionToken(req);
            const session = sessions.get(token);
            if (session) session.pendingTotpSecret = base32Secret;
            return json(res, { qrCode, secret: base32Secret, manualEntry: totp.toString() });
        }

        if (method === 'POST' && p === '/api/2fa/confirm-setup') {
            const user = getSessionUser(req);
            if (!user) return json(res, { error: 'Nicht authentifiziert' }, 401);
            const token = getSessionToken(req);
            const session = sessions.get(token);
            if (!session || !session.pendingTotpSecret) return json(res, { error: 'Kein 2FA-Setup aktiv' }, 400);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const code = (data.code || '').trim();
            if (!code) return json(res, { error: 'Code erforderlich' }, 400);
            if (verifyTOTP(session.pendingTotpSecret, code)) {
                const users = loadUsers();
                const u = users.find(u => u.id === user.id);
                if (u) {
                    u.totpSecret = session.pendingTotpSecret;
                    saveUsers(users);
                }
                delete session.pendingTotpSecret;
                addAuditEntry(user.name, '2fa.enable', user.email, '2FA aktiviert');
                return json(res, { ok: true });
            }
            return json(res, { error: 'Ungueltiger Code' }, 400);
        }

        if (method === 'POST' && p === '/api/2fa/disable') {
            const user = getSessionUser(req);
            if (!user) return json(res, { error: 'Nicht authentifiziert' }, 401);
            if (!user.totpSecret) return json(res, { error: '2FA ist nicht aktiviert' }, 400);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            const code = (data.code || '').trim();
            if (!code) return json(res, { error: 'Code erforderlich' }, 400);
            if (verifyTOTP(user.totpSecret, code)) {
                const users = loadUsers();
                const u = users.find(u => u.id === user.id);
                if (u) {
                    delete u.totpSecret;
                    saveUsers(users);
                }
                addAuditEntry(user.name, '2fa.disable', user.email, '2FA deaktiviert');
                return json(res, { ok: true });
            }
            return json(res, { error: 'Ungueltiger Code' }, 400);
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
            addAuditEntry(me.name, 'user.create', newUser.email, `Role: ${newUser.role}`);
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
            if (data.password && data.password.length >= 8) {
                user.passwordHash = await bcrypt.hash(data.password, 12);
                invalidateUserSessions(user.id, isSelf ? getSessionToken(req) : null);
            }
            if (data.status === 'disabled') {
                invalidateUserSessions(user.id);
            }

            saveUsers(users);
            addAuditEntry(me.name, 'user.update', user.email, `Updated fields: ${Object.keys(data).join(', ')}`);
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
            const deletedUser = users[idx];
            users.splice(idx, 1);
            saveUsers(users);
            addAuditEntry(me.name, 'user.delete', deletedUser.email, `Deleted user: ${deletedUser.name}`);

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
            const botStatuses = await Promise.all(bots.map(async b => ({ ...b, ...(await getBotStatus(b.service)) })));
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
            const bots = await Promise.all(config.bots.filter(b => b.server === serverId).map(async b => ({
                ...b,
                ...(await getBotStatus(b.service))
            })));

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
            const bots = await Promise.all(config.bots.map(async bot => ({
                ...bot,
                ...(await getBotStatus(bot.service)),
            })));
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
            return json(res, { ...bot, ...(await getBotStatus(bot.service)) });
        }

        // Bot Logs
        const logsMatch = p.match(/^\/api\/bots\/([\w-]+)\/logs$/);
        if (method === 'GET' && logsMatch) {
            const bot = config.bots.find(b => b.id === logsMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const lines = parseInt(url.searchParams.get('lines')) || 50;
            return json(res, { logs: await getBotLogs(bot.service, lines) });
        }

        // Bot Control
        const controlMatch = p.match(/^\/api\/bots\/([\w-]+)\/(start|stop|restart)$/);
        if (method === 'POST' && controlMatch) {
            const bot = config.bots.find(b => b.id === controlMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const action = controlMatch[2];
            await controlBot(bot.service, action);

            const actionUser = getSessionUser(req);
            addAuditEntry(actionUser ? actionUser.name : 'Unknown', `bot.${action}`, bot.name, `Service: ${bot.service}`);
            addDeployment({
                type: action,
                bot: bot.name,
                botId: bot.id,
                server: bot.server,
                user: actionUser ? actionUser.name : 'Unknown',
                status: 'success'
            });

            await new Promise(r => setTimeout(r, 2000));
            return json(res, { ok: true, ...(await getBotStatus(bot.service)) });
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
                const { stdout } = await execFileAsync('journalctl', ['--no-pager', '-n', String(Math.min(lines, 200)), '--output=short-iso'], { encoding: 'utf8', timeout: 5000 });
                logs = stdout;
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

        // ── Audit Log Route ─────────────────────────────────────
        if (method === 'GET' && p === '/api/audit-log') {
            const me = getSessionUser(req);
            if (!me) return json(res, { error: 'Nicht authentifiziert' }, 401);
            const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit')) || 100), 500);
            const entries = loadAuditLog().slice(0, limit);
            return json(res, { entries });
        }

        // ── File Browser Routes ────────────────────────────────
        const FILE_BASE = IS_WINDOWS ? process.cwd() : '/home/ubuntu';

        const PROTECTED_FILES = ['audit.json', 'users.json', '.env', 'id_rsa', 'id_ed25519', 'id_ecdsa', 'config.json', 'authorized_keys', '.bash_history', 'shadow', 'passwd'];

        function resolveSafePath(requestedPath) {
            const resolved = path.resolve(FILE_BASE, requestedPath || '');
            if (!resolved.startsWith(FILE_BASE)) return null;
            const basename = path.basename(resolved);
            if (PROTECTED_FILES.includes(basename)) return null;
            return resolved;
        }

        if (method === 'GET' && p === '/api/files') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const reqPath = url.searchParams.get('path') || FILE_BASE;
            const safePath = resolveSafePath(reqPath);
            if (!safePath) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                const items = fs.readdirSync(safePath);
                const entries = [];
                for (const name of items) {
                    try {
                        const fullPath = path.join(safePath, name);
                        const stat = fs.statSync(fullPath);
                        entries.push({
                            name,
                            type: stat.isDirectory() ? 'dir' : 'file',
                            size: stat.size,
                            modified: stat.mtime.toISOString(),
                            permissions: (stat.mode & 0o777).toString(8)
                        });
                    } catch { /* skip inaccessible entries */ }
                }
                return json(res, { entries, currentPath: safePath });
            } catch (err) {
                return json(res, { error: 'Verzeichnis nicht lesbar', details: err.message }, 400);
            }
        }

        if (method === 'GET' && p === '/api/files/read') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const reqPath = url.searchParams.get('path') || '';
            const safePath = resolveSafePath(reqPath);
            if (!safePath) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                const stat = fs.statSync(safePath);
                if (stat.size > 1024 * 1024) return json(res, { error: 'Datei zu gross (max 1MB)' }, 400);
                if (stat.isDirectory()) return json(res, { error: 'Ist ein Verzeichnis' }, 400);
                const content = fs.readFileSync(safePath, 'utf8');
                return json(res, { content, path: safePath, size: stat.size });
            } catch (err) {
                return json(res, { error: 'Datei nicht lesbar', details: err.message }, 400);
            }
        }

        if (method === 'POST' && p === '/api/files/write') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!data.path || typeof data.content !== 'string') return json(res, { error: 'path und content erforderlich' }, 400);
            const safePath = resolveSafePath(data.path);
            if (!safePath) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                fs.writeFileSync(safePath, data.content, 'utf8');
                addAuditEntry(me.name, 'file.write', safePath, `${data.content.length} Bytes geschrieben`);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Schreiben fehlgeschlagen', details: err.message }, 500);
            }
        }

        if (method === 'POST' && p === '/api/files/mkdir') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!data.path) return json(res, { error: 'path erforderlich' }, 400);
            const safePath = resolveSafePath(data.path);
            if (!safePath) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                fs.mkdirSync(safePath, { recursive: true });
                addAuditEntry(me.name, 'file.mkdir', safePath);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Erstellen fehlgeschlagen', details: err.message }, 500);
            }
        }

        if (method === 'POST' && p === '/api/files/delete') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!data.path) return json(res, { error: 'path erforderlich' }, 400);
            const safePath = resolveSafePath(data.path);
            if (!safePath) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                const stat = fs.statSync(safePath);
                if (stat.isDirectory()) {
                    fs.rmSync(safePath, { recursive: true });
                } else {
                    fs.unlinkSync(safePath);
                }
                addAuditEntry(me.name, 'file.delete', safePath);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Loeschen fehlgeschlagen', details: err.message }, 500);
            }
        }

        // ── Env Variables Routes ───────────────────────────────
        const envGetMatch = p.match(/^\/api\/bots\/([\w-]+)\/env$/);
        if (method === 'GET' && envGetMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const bot = config.bots.find(b => b.id === envGetMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const envPath = path.resolve(__dirname, '..', 'bots', bot.service, '.env');
            try {
                const content = fs.readFileSync(envPath, 'utf8');
                const vars = content.split('\n')
                    .filter(line => line.trim() && !line.trim().startsWith('#'))
                    .map(line => {
                        const eqIdx = line.indexOf('=');
                        if (eqIdx === -1) return null;
                        return { key: line.substring(0, eqIdx).trim(), value: line.substring(eqIdx + 1).trim() };
                    })
                    .filter(Boolean);
                return json(res, { vars });
            } catch {
                return json(res, { vars: [] });
            }
        }

        if (method === 'POST' && envGetMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const bot = config.bots.find(b => b.id === envGetMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!Array.isArray(data.vars)) return json(res, { error: 'vars Array erforderlich' }, 400);
            const envPath = path.resolve(__dirname, '..', 'bots', bot.service, '.env');
            const content = data.vars.map(v => `${v.key}=${v.value}`).join('\n') + '\n';
            try {
                fs.writeFileSync(envPath, content, 'utf8');
                addAuditEntry(me.name, 'env.update', bot.name, `${data.vars.length} Variablen aktualisiert`);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Env schreiben fehlgeschlagen', details: err.message }, 500);
            }
        }

        // ── Docker Routes ──────────────────────────────────────
        if (method === 'GET' && p === '/api/docker/containers') {
            try {
                const raw = execSync("docker ps -a --format '{{json .}}'", { encoding: 'utf8', timeout: 10000 });
                const containers = raw.trim().split('\n').filter(Boolean).map(line => {
                    try {
                        const c = JSON.parse(line);
                        return {
                            id: c.ID,
                            name: c.Names,
                            image: c.Image,
                            status: c.Status,
                            state: c.State,
                            ports: c.Ports,
                            created: c.CreatedAt
                        };
                    } catch { return null; }
                }).filter(Boolean);
                return json(res, { containers });
            } catch {
                return json(res, { containers: [] });
            }
        }

        const dockerActionMatch = p.match(/^\/api\/docker\/containers\/([\w]+)\/(start|stop|restart)$/);
        if (method === 'POST' && dockerActionMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const containerId = dockerActionMatch[1];
            const dockerAction = dockerActionMatch[2];
            if (!/^[\w]+$/.test(containerId)) return json(res, { error: 'Ungueltige Container ID' }, 400);
            try {
                execSync(`docker ${dockerAction} ${containerId}`, { encoding: 'utf8', timeout: 30000 });
                addAuditEntry(me.name, `docker.${dockerAction}`, containerId);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Docker Aktion fehlgeschlagen', details: err.message }, 500);
            }
        }

        const dockerLogsMatch = p.match(/^\/api\/docker\/containers\/([\w]+)\/logs$/);
        if (method === 'GET' && dockerLogsMatch) {
            const containerId = dockerLogsMatch[1];
            if (!/^[\w]+$/.test(containerId)) return json(res, { error: 'Ungueltige Container ID' }, 400);
            const lines = Math.min(Math.max(1, parseInt(url.searchParams.get('lines')) || 100), 1000);
            try {
                const logs = execSync(`docker logs --tail ${lines} ${containerId} 2>&1`, { encoding: 'utf8', timeout: 10000 });
                return json(res, { logs });
            } catch {
                return json(res, { logs: 'Keine Logs verfuegbar' });
            }
        }

        // ── Firewall Route ─────────────────────────────────────
        if (method === 'GET' && p === '/api/firewall') {
            try {
                const raw = execSync('sudo ufw status numbered 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
                const lines = raw.trim().split('\n');
                const statusLine = lines.find(l => l.startsWith('Status:'));
                const status = statusLine ? statusLine.split(':')[1].trim() : 'unknown';
                const rules = [];
                for (const line of lines) {
                    const match = line.match(/^\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT|LIMIT)\s+(IN|OUT)?\s*(.*)$/i);
                    if (match) {
                        rules.push({
                            number: parseInt(match[1]),
                            to: match[2].trim(),
                            action: match[3],
                            direction: match[4] || 'IN',
                            from: match[5].trim()
                        });
                    }
                }
                return json(res, { rules, status });
            } catch {
                return json(res, { rules: [], status: IS_WINDOWS ? 'not available on Windows' : 'error' });
            }
        }

        // ── Cron Route ─────────────────────────────────────────
        if (method === 'GET' && p === '/api/cron') {
            const jobs = [];
            try {
                const userCron = execSync('crontab -l 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
                for (const line of userCron.trim().split('\n')) {
                    if (line.trim() && !line.trim().startsWith('#')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 6) {
                            jobs.push({ schedule: parts.slice(0, 5).join(' '), command: parts.slice(5).join(' '), user: 'current' });
                        }
                    }
                }
            } catch { /* no user crontab */ }
            try {
                const rootCron = execSync('sudo crontab -l 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
                for (const line of rootCron.trim().split('\n')) {
                    if (line.trim() && !line.trim().startsWith('#')) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 6) {
                            jobs.push({ schedule: parts.slice(0, 5).join(' '), command: parts.slice(5).join(' '), user: 'root' });
                        }
                    }
                }
            } catch { /* no root crontab */ }
            return json(res, { jobs });
        }

        // ── Backup Routes ──────────────────────────────────────
        if (method === 'GET' && p === '/api/backups') {
            const backupDir = (config.backups && config.backups.directory) || '/home/ubuntu/backups';
            try {
                const items = fs.readdirSync(backupDir);
                const backups = items.map(name => {
                    try {
                        const stat = fs.statSync(path.join(backupDir, name));
                        return {
                            name,
                            size: stat.size,
                            date: stat.mtime.toISOString(),
                            type: name.endsWith('.tar.gz') ? 'tar.gz' : path.extname(name).replace('.', '') || 'unknown'
                        };
                    } catch { return null; }
                }).filter(Boolean);
                return json(res, { backups });
            } catch {
                return json(res, { backups: [] });
            }
        }

        if (method === 'POST' && p === '/api/backups/create') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data = {};
            try { data = JSON.parse(body); } catch { /* use defaults */ }
            const backupDir = (config.backups && config.backups.directory) || '/home/ubuntu/backups';
            const name = (data.name && /^[\w.-]+$/.test(data.name) ? data.name : `backup-${Date.now()}`) + '.tar.gz';
            const backupPath = path.join(backupDir, name);
            try {
                await execFileAsync('mkdir', ['-p', backupDir], { timeout: 5000 });
                await execFileAsync('tar', ['-czf', backupPath, '/home/ubuntu/bots/'], { timeout: 120000 });
                const stat = fs.statSync(backupPath);
                const backup = { name, size: stat.size, date: stat.mtime.toISOString(), type: 'tar.gz' };
                addAuditEntry(me.name, 'backup.create', name, `${stat.size} Bytes`);
                return json(res, { ok: true, backup });
            } catch (err) {
                return json(res, { error: 'Backup fehlgeschlagen', details: err.message }, 500);
            }
        }

        if (method === 'POST' && p === '/api/backups/delete') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!data.name || !/^[\w.-]+$/.test(data.name)) return json(res, { error: 'Ungueltiger Backup-Name' }, 400);
            const backupDir = (config.backups && config.backups.directory) || '/home/ubuntu/backups';
            const backupPath = path.join(backupDir, data.name);
            // Prevent path traversal
            if (!backupPath.startsWith(backupDir)) return json(res, { error: 'Zugriff verweigert' }, 403);
            try {
                fs.unlinkSync(backupPath);
                addAuditEntry(me.name, 'backup.delete', data.name);
                return json(res, { ok: true });
            } catch (err) {
                return json(res, { error: 'Loeschen fehlgeschlagen', details: err.message }, 500);
            }
        }

        // ── Webhook Settings Routes ────────────────────────────
        if (method === 'GET' && p === '/api/settings/webhook') {
            const me = getSessionUser(req);
            if (!me) return json(res, { error: 'Nicht authentifiziert' }, 401);
            return json(res, { url: config.webhook ? config.webhook.url : '', enabled: config.webhook ? config.webhook.enabled : false });
        }

        if (method === 'POST' && p === '/api/settings/webhook') {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            if (!config.webhook) config.webhook = {};
            if (typeof data.url === 'string') config.webhook.url = data.url;
            if (typeof data.enabled === 'boolean') config.webhook.enabled = data.enabled;
            saveConfig();
            addAuditEntry(me.name, 'settings.webhook', 'webhook', `Enabled: ${config.webhook.enabled}`);
            return json(res, { ok: true });
        }

        // ── SSL Check Route ────────────────────────────────────
        if (method === 'GET' && p === '/api/ssl-check') {
            const host = url.searchParams.get('host') || '';
            if (!host || !/^[\w.-]+$/.test(host)) return json(res, { error: 'Ungueltiger Hostname' }, 400);
            try {
                const raw = execSync(`echo | openssl s_client -connect ${host}:443 -servername ${host} 2>/dev/null | openssl x509 -noout -dates -issuer`, { encoding: 'utf8', timeout: 10000 });
                let issuer = '', notBefore = '', notAfter = '';
                for (const line of raw.trim().split('\n')) {
                    if (line.startsWith('issuer=')) issuer = line.replace('issuer=', '').trim();
                    if (line.startsWith('notBefore=')) notBefore = line.replace('notBefore=', '').trim();
                    if (line.startsWith('notAfter=')) notAfter = line.replace('notAfter=', '').trim();
                }
                const expires = notAfter ? new Date(notAfter) : null;
                const daysLeft = expires ? Math.floor((expires.getTime() - Date.now()) / 86400000) : 0;
                return json(res, { valid: daysLeft > 0, issuer, expires: notAfter, daysLeft, error: null });
            } catch (err) {
                return json(res, { valid: false, issuer: null, expires: null, daysLeft: 0, error: IS_WINDOWS ? 'Nicht verfuegbar auf Windows' : err.message });
            }
        }

        // ── Uptime Route ───────────────────────────────────────
        if (method === 'GET' && p === '/api/uptime') {
            const targets = (config.uptime && config.uptime.targets) || [];
            const checks = targets.map(t => {
                const results = uptimeResults[t.host] || [];
                const upCount = results.filter(r => r.status === 'up').length;
                const uptimePercent = results.length > 0 ? ((upCount / results.length) * 100).toFixed(1) : 0;
                const upResults = results.filter(r => r.status === 'up');
                const avgLatency = upResults.length > 0 ? (upResults.reduce((s, r) => s + r.latency, 0) / upResults.length).toFixed(1) : 0;
                const last = results.length > 0 ? results[results.length - 1] : null;
                return {
                    name: t.name,
                    host: t.host,
                    latency: last ? last.latency : 0,
                    status: last ? last.status : 'unknown',
                    uptimePercent: parseFloat(uptimePercent),
                    avgLatency: parseFloat(avgLatency),
                    lastCheck: last ? new Date(last.time).toISOString() : null
                };
            });
            return json(res, { checks, history: uptimeResults });
        }

        // ── Crash Recovery Routes ──────────────────────────────
        const recoveryGetMatch = p.match(/^\/api\/bots\/([\w-]+)\/recovery$/);
        if (method === 'GET' && recoveryGetMatch) {
            const me = getSessionUser(req);
            if (!me) return json(res, { error: 'Nicht authentifiziert' }, 401);
            const bot = config.bots.find(b => b.id === recoveryGetMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            return json(res, bot.recovery || { enabled: true, maxRestarts: 5, restartDelay: 3, backoff: 'exponential', healthCheckUrl: null });
        }

        if (method === 'POST' && recoveryGetMatch) {
            const me = getSessionUser(req);
            if (!me || me.role !== 'admin') return json(res, { error: 'Keine Berechtigung' }, 403);
            const bot = config.bots.find(b => b.id === recoveryGetMatch[1]);
            if (!bot) return json(res, { error: 'Bot nicht gefunden' }, 404);
            const body = await parseBody(req);
            let data;
            try { data = JSON.parse(body); } catch { return json(res, { error: 'Ungueltiges JSON' }, 400); }
            bot.recovery = {
                enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
                maxRestarts: parseInt(data.maxRestarts) || 5,
                restartDelay: parseInt(data.restartDelay) || 3,
                backoff: ['linear', 'exponential', 'fixed'].includes(data.backoff) ? data.backoff : 'exponential',
                healthCheckUrl: data.healthCheckUrl || null
            };
            saveConfig();
            addAuditEntry(me.name, 'recovery.update', bot.name, JSON.stringify(bot.recovery));
            return json(res, { ok: true });
        }

        // ── Long-term Metrics Route ────────────────────────────
        if (method === 'GET' && p === '/api/metrics/history') {
            const range = url.searchParams.get('range') || '24h';
            let cutoff = Date.now();
            if (range === '1h') cutoff -= 60 * 60 * 1000;
            else if (range === '6h') cutoff -= 6 * 60 * 60 * 1000;
            else cutoff -= 24 * 60 * 60 * 1000;
            const filtered = persistedMetricsHistory.filter(m => m.time >= cutoff);
            return json(res, { metrics: filtered });
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

server.timeout = 30000;           // 30s max request time
server.headersTimeout = 10000;    // 10s for headers
server.requestTimeout = 30000;    // 30s total request timeout
server.keepAliveTimeout = 5000;   // 5s keep-alive

server.listen(PORT, () => console.log(`Dashboard laeuft auf Port ${PORT}`));

// ── WebSocket SSH Terminal ───────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    // Auth check: parse session cookie from upgrade request
    const cookie = req.headers.cookie || '';
    const sessionMatch = cookie.match(/session=([a-f0-9]+)/);
    if (!sessionMatch) {
        ws.close(4001, 'Nicht authentifiziert');
        return;
    }
    const session = sessions.get(sessionMatch[1]);
    if (!session || session.pending2FA) {
        ws.close(4001, 'Ungueltige Session');
        return;
    }

    // Only admins may open SSH terminals
    const sessionUser = findUserById(session.userId);
    if (!sessionUser || sessionUser.role !== 'admin') {
        ws.close(4003, 'Keine Berechtigung');
        return;
    }

    // Parse target server from URL query: ws://host/terminal?server=oracle-prod-01
    const wsUrl = new URL(req.url, `http://localhost:${PORT}`);
    const serverId = wsUrl.searchParams.get('server');
    const srv = config.servers.find(s => s.id === serverId);

    if (!srv) {
        ws.close(4002, 'Server nicht gefunden');
        return;
    }

    // For local server, use localhost SSH
    const sshConfig = {
        host: srv.isLocal ? '127.0.0.1' : srv.host,
        port: 22,
        username: srv.user || 'ubuntu',
        // Try agent auth first (SSH_AUTH_SOCK), then key-based
        agent: process.env.SSH_AUTH_SOCK || undefined,
        privateKey: undefined,
    };

    // Try to load SSH key
    const keyPaths = [
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'id_rsa'),
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'id_ed25519'),
    ];
    for (const keyPath of keyPaths) {
        try {
            sshConfig.privateKey = fs.readFileSync(keyPath);
            break;
        } catch {}
    }

    if (!sshConfig.agent && !sshConfig.privateKey) {
        ws.send(JSON.stringify({ type: 'error', data: 'Kein SSH-Key gefunden. Bitte SSH-Key unter ~/.ssh/ ablegen.' }));
        ws.close(4003, 'Kein SSH-Key');
        return;
    }

    const ssh = new SSHClient();
    let stream = null;

    ssh.on('ready', () => {
        ws.send(JSON.stringify({ type: 'status', data: 'connected' }));

        ssh.shell({ term: 'xterm-256color', cols: 120, rows: 30 }, (err, s) => {
            if (err) {
                ws.send(JSON.stringify({ type: 'error', data: err.message }));
                ws.close();
                return;
            }
            stream = s;

            stream.on('data', (data) => {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'data', data: data.toString('utf8') }));
                }
            });

            stream.on('close', () => {
                ws.close();
            });

            stream.stderr.on('data', (data) => {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'data', data: data.toString('utf8') }));
                }
            });
        });
    });

    ssh.on('error', (err) => {
        ws.send(JSON.stringify({ type: 'error', data: 'SSH-Verbindung fehlgeschlagen: ' + err.message }));
        ws.close();
    });

    ws.on('message', (msg) => {
        try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'data' && stream) {
                stream.write(parsed.data);
            } else if (parsed.type === 'resize' && stream) {
                stream.setWindow(parsed.rows, parsed.cols, 0, 0);
            }
        } catch {}
    });

    ws.on('close', () => {
        if (stream) stream.close();
        ssh.end();
    });

    ssh.connect(sshConfig);

    // Add audit entry
    const user = findUserById(session.userId);
    addAuditEntry(user ? user.name : 'Unknown', 'ssh_connect', srv.name, `Terminal-Verbindung zu ${srv.host}`);
});

console.log('WebSocket SSH-Terminal bereit');

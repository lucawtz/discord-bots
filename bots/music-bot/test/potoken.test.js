// Prueft die poToken-Bruecke gegen gefaelschte Gegenstellen: einen
// bgutil-Provider und eine Lavalink-/youtube-Route. Kein Netz, kein Docker.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { mintPoToken, pingProvider, pushToLavalink, startPotRefresher } = require('../src/audio/potoken');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake-Provider + Fake-Lavalink in einem Server, getrennt nach Pfad.
async function startFakes({ potBehaviour } = {}) {
    const calls = [];
    let mintCount = 0;

    const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const parsed = body ? JSON.parse(body) : null;
            calls.push({ method: req.method, path: req.url, body: parsed, auth: req.headers.authorization });
            res.setHeader('Content-Type', 'application/json');

            if (req.url === '/ping') return res.end(JSON.stringify({ server_uptime: 42, version: '1.3.1' }));

            if (req.url === '/get_pot') {
                mintCount++;
                const behave = potBehaviour?.(mintCount, parsed);
                if (behave?.fail) { res.writeHead(500).end(JSON.stringify({ error: behave.fail })); return; }
                return res.end(JSON.stringify({
                    poToken: `POTOKEN-${mintCount}`,
                    contentBinding: parsed?.content_binding,
                    expiresAt: behave?.expiresAt ?? new Date(Date.now() + 6 * 3600_000).toISOString(),
                }));
            }

            if (req.url === '/youtube') {
                if (req.headers.authorization !== 'probe') { res.writeHead(401).end('{}'); return; }
                res.writeHead(204).end();
                return;
            }
            res.writeHead(404).end('{}');
        });
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    return {
        port,
        url: `http://127.0.0.1:${port}`,
        calls,
        find: (p) => calls.filter(c => c.path === p),
        close: () => new Promise(r => server.close(r)),
    };
}

test('pingProvider liest Version und Laufzeit', async () => {
    const f = await startFakes();
    try {
        const pong = await pingProvider(f.url);
        assert.strictEqual(pong.version, '1.3.1');
    } finally { await f.close(); }
});

test('mintPoToken bindet den Token an visitorData', async () => {
    const f = await startFakes();
    try {
        const out = await mintPoToken(f.url, 'VISITOR-123');
        assert.strictEqual(out.poToken, 'POTOKEN-1');
        // Die Bindung ist der Kern: ein Token gilt nur zu SEINEM visitorData.
        assert.strictEqual(out.visitorData, 'VISITOR-123');
        assert.ok(out.expiresAt instanceof Date);

        const call = f.find('/get_pot')[0];
        assert.strictEqual(call.body.content_binding, 'VISITOR-123',
            'der Provider erwartet content_binding, nicht visitor_data (seit 1.3.x deprecated)');
        assert.strictEqual(call.body.bypass_cache, false);
    } finally { await f.close(); }
});

test('mintPoToken reicht einen Proxy durch, wenn gesetzt', async () => {
    const f = await startFakes();
    try {
        await mintPoToken(f.url, 'V', { proxy: 'socks5://tunnel:1080' });
        assert.strictEqual(f.find('/get_pot')[0].body.proxy, 'socks5://tunnel:1080');
    } finally { await f.close(); }
});

test('mintPoToken meldet Provider-Fehler im Klartext', async () => {
    const f = await startFakes({ potBehaviour: () => ({ fail: 'BotGuard failed' }) });
    try {
        await assert.rejects(() => mintPoToken(f.url, 'V'), /BotGuard failed/);
    } finally { await f.close(); }
});

test('pushToLavalink schickt das Paar an die Plugin-Route mit Passwort', async () => {
    const f = await startFakes();
    try {
        await pushToLavalink({ host: '127.0.0.1', port: f.port, password: 'probe' },
            { poToken: 'PT', visitorData: 'VD' });
        const call = f.find('/youtube')[0];
        assert.strictEqual(call.method, 'POST');
        assert.strictEqual(call.auth, 'probe');
        assert.deepStrictEqual(call.body, { poToken: 'PT', visitorData: 'VD' });
    } finally { await f.close(); }
});

test('pushToLavalink scheitert laut bei falschem Passwort', async () => {
    const f = await startFakes();
    try {
        await assert.rejects(
            () => pushToLavalink({ host: '127.0.0.1', port: f.port, password: 'falsch' }, { poToken: 'PT', visitorData: 'VD' }),
            /401/);
    } finally { await f.close(); }
});

test('Refresher: Erfolgspfad holt, mintet, schiebt und merkt sich alles', async () => {
    const f = await startFakes();
    const logs = [];
    let refresher;
    try {
        refresher = startPotRefresher({
            lavalink: { host: '127.0.0.1', port: f.port, password: 'probe' },
            providerUrl: f.url,
            getVisitorData: async () => 'VISITOR-AUS-TEST',
            onLog: m => logs.push(m),
            onError: m => logs.push('FEHLER ' + m),
        });
        await refresher.started;

        assert.strictEqual(refresher.state.poToken, 'POTOKEN-1');
        assert.strictEqual(refresher.state.visitorData, 'VISITOR-AUS-TEST');
        assert.ok(refresher.state.lastOk instanceof Date);
        assert.strictEqual(refresher.state.lastError, null);

        // Das Paar muss GEMEINSAM bei Lavalink ankommen — ein Token ohne sein
        // visitorData ist wertlos.
        assert.deepStrictEqual(f.find('/youtube')[0].body, {
            poToken: 'POTOKEN-1', visitorData: 'VISITOR-AUS-TEST',
        });
        assert.ok(logs.some(l => /erneuert/.test(l)), logs.join(' | '));
    } finally { refresher?.stop(); await f.close(); }
});

test('Refresher erneuert vor Ablauf, nicht danach', async () => {
    // Token laeuft in 40 Minuten ab; mit 30 Minuten Sicherheitsabstand bleiben
    // 10 Minuten — mehr als das Minimum von 5, also genau diese Wartezeit.
    const expiresAt = new Date(Date.now() + 40 * 60_000).toISOString();
    const f = await startFakes({ potBehaviour: () => ({ expiresAt }) });
    let refresher;
    try {
        const delays = [];
        const realSetTimeout = global.setTimeout;
        global.setTimeout = (fn, ms) => { delays.push(ms); return realSetTimeout(() => {}, 0); };
        try {
            refresher = startPotRefresher({
                lavalink: { host: '127.0.0.1', port: f.port, password: 'probe' },
                providerUrl: f.url,
                getVisitorData: async () => 'V',
                onLog: () => {}, onError: () => {},
            });
            await refresher.started;
        } finally { global.setTimeout = realSetTimeout; }

        const planned = delays[delays.length - 1];
        assert.ok(planned >= 9 * 60_000 && planned <= 11 * 60_000,
            `Erneuerung sollte in ~10 min liegen, geplant waren ${Math.round(planned / 60000)} min`);
    } finally { refresher?.stop(); await f.close(); }
});

test('Refresher gibt nach Fehlern nicht auf, sondern verlangsamt', async () => {
    const f = await startFakes({ potBehaviour: () => ({ fail: 'kaputt' }) });
    const errors = [];
    let refresher;
    try {
        refresher = startPotRefresher({
            lavalink: { host: '127.0.0.1', port: f.port, password: 'probe' },
            providerUrl: f.url,
            getVisitorData: async () => 'V',
            onLog: () => {},
            onError: m => errors.push(m),
        });
        await refresher.started;
        assert.ok(refresher.state.lastError, 'Fehler wird im Zustand vermerkt');
        assert.strictEqual(refresher.state.poToken, null, 'kein Token bei Fehlschlag');
    } finally { refresher?.stop(); await f.close(); }
});

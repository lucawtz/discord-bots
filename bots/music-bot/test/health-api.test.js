// Prueft, dass /health und die Statusseite den Zustand der KETTE zeigen —
// gegen den echten API-Server, nur mit gefaelschtem Discord-Client.
process.env.BEATBYTE_TEST = '1';
process.env.API_PORT = '0';           // freier Port
process.env.API_KEY = 'test-key';

const test = require('node:test');
const assert = require('node:assert');

const { ctx } = require('../src/index.js');
const { startAPI } = require('../src/api.js');

const fakeClient = {
    user: { id: '1', tag: 'BeatByteTest#0001', displayAvatarURL: () => '' },
    guilds: { cache: new Map([['g1', { id: 'g1', name: 'Test' }]]) },
};

let base;
let apiServer;
test.after(async () => {
    // Ohne das haelt der lauschende Server den Testprozess offen. close()
    // allein reicht nicht: fetch() haelt die Verbindungen per Keep-alive offen,
    // und close() wartet auf jede einzelne.
    if (!apiServer) return;
    apiServer.closeAllConnections?.();
    await new Promise(r => apiServer.close(r));
});
test.before(async () => {
    // API_PORT=0 laesst das Betriebssystem einen freien Port waehlen; die echte
    // Portnummer steht danach am Server.
    const api = startAPI(ctx, fakeClient);
    const { server } = api;
    apiServer = server;
    if (!server.listening) await new Promise(r => server.once('listening', r));
    const port = server.address().port;
    assert.ok(port, 'API-Server muss einen Port haben');
    base = `http://127.0.0.1:${port}`;
});

// Zustand der Kette setzen, ohne eine echte Probe zu fahren.
function setChain(state) {
    ctx.health = {
        getHealth: () => ({
            chain: { healthy: null, lastRun: null, lastOkAt: null, lastMs: null, lastError: null, consecutiveFailures: 0, runs: 0, intervalMs: 900000, ...state.chain },
            playback: { trackStarts: 0, firstAudioP50Ms: null, firstAudioP95Ms: null, searchP50Ms: null, bySource: { youtube: 0, soundcloud: 0, other: 0 }, soundcloudShare: 0, soundcloudFallbacks: 0, streamErrors: 0, errorsByReason: {}, ...state.playback },
        }),
        statusLine: () => 'test',
    };
}

test('/health liefert Prozess UND Kette', async () => {
    setChain({ chain: { healthy: true, lastMs: 820 }, playback: { firstAudioP50Ms: 1100, soundcloudShare: 0.1 } });
    const res = await fetch(`${base}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.process.ok, true);
    assert.strictEqual(body.chain.healthy, true);
    assert.strictEqual(body.chain.lastMs, 820);
    assert.strictEqual(body.playback.firstAudioP50Ms, 1100);
    assert.ok(typeof body.process.activePlayers === 'number');
});

test('/health bleibt 200, auch wenn die Kette gestoert ist', async () => {
    // Sonst wuerde der Docker-Healthcheck anschlagen und autoheal den Container
    // im Kreis neu starten — eine YouTube-Sperre repariert das nicht.
    setChain({ chain: { healthy: false, lastError: 'HTTP Error 403: Forbidden', consecutiveFailures: 3 } });
    const res = await fetch(`${base}/health`);
    assert.strictEqual(res.status, 200, 'kein 503 — sonst Neustartschleife');
    const body = await res.json();
    assert.strictEqual(body.chain.healthy, false);
    assert.match(body.chain.lastError, /403/);
    assert.strictEqual(body.process.ok, true, 'der Prozess ist ja gesund');
});

test('Statusseite zeigt eine gestoerte Kette rot statt gruen', async () => {
    setChain({ chain: { healthy: false, lastError: 'ProxyError: tunnel weg' } });
    const html = await (await fetch(`${base}/status`)).text();
    assert.match(html, /YouTube-Kette gestört/, 'Beschriftung muss die Stoerung nennen');
    assert.match(html, /#ef4444/, 'Punkt muss rot sein');
    assert.match(html, /ProxyError: tunnel weg/, 'der Grund gehoert auf die Seite');
    assert.ok(!/>\s*Online\s*</.test(html), 'darf nicht gleichzeitig "Online" behaupten');
});

test('Statusseite bei gesunder Kette', async () => {
    setChain({ chain: { healthy: true }, playback: { firstAudioP50Ms: 950, soundcloudShare: 0.25 } });
    const html = await (await fetch(`${base}/status`)).text();
    assert.match(html, /#00e676/, 'gruener Punkt');
    assert.match(html, /950 ms/, 'p50 sichtbar');
    assert.match(html, /25 %/, 'SoundCloud-Anteil sichtbar');
    assert.ok(!/gestört/.test(html));
});

test('Statusseite haelt sich vor der ersten Probe zurueck', async () => {
    setChain({ chain: { healthy: null } });
    const html = await (await fetch(`${base}/status`)).text();
    assert.match(html, /wird geprüft/, 'weder gruen noch rot, solange nichts gemessen wurde');
    assert.match(html, /#f59e0b/);
});

test('/health schwaerzt interne Namen fuer Fremde', async () => {
    // Caddy stellt den Bot oeffentlich bereit. yt-dlp-Fehler nennen den Proxy
    // und interne Hostnamen — die gehoeren nicht ins offene Netz.
    setChain({
        chain: { healthy: false, lastError: 'ProxyError: socks5://host.docker.internal:1080 unreachable (167.233.237.112:443)' },
        playback: { errorsByReason: { 'pot-provider:4416 timeout': 2 } },
    });
    const body = await (await fetch(`${base}/health`)).json();

    assert.strictEqual(body.chain.healthy, false, 'der Zustand bleibt sichtbar');
    assert.ok(!/host\.docker\.internal/.test(body.chain.lastError), body.chain.lastError);
    assert.ok(!/167\.233\.237\.112/.test(body.chain.lastError), body.chain.lastError);
    assert.ok(!/1080/.test(body.chain.lastError), body.chain.lastError);
    assert.ok(!JSON.stringify(body.playback.errorsByReason).includes('pot-provider'));
    assert.match(body.chain.lastError, /ProxyError/, 'die Fehlerart bleibt lesbar');
});

test('/health zeigt mit API-Key den vollen Text', async () => {
    setChain({ chain: { healthy: false, lastError: 'ProxyError: socks5://host.docker.internal:1080 unreachable' } });
    const body = await (await fetch(`${base}/health`, { headers: { 'x-api-key': 'test-key' } })).json();
    assert.match(body.chain.lastError, /host\.docker\.internal:1080/, 'zum Debuggen ungekuerzt');
});

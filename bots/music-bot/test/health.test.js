// Prueft den Ketten-Monitor: Probe-Auswertung, Alarm bei Uebergang,
// Erholungsmeldung und die Kennzahlen. Kein Netz, kein yt-dlp.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const { Readable } = require('stream');

const { createHealthMonitor } = require('../src/health');

// Gefaelschtes yt-dlp: liefert wahlweise Bytes, nichts, oder einen Fehler.
function fakeSpawn(plan) {
    let call = 0;
    return () => {
        const step = plan[Math.min(call++, plan.length - 1)];
        const proc = new EventEmitter();
        proc.killed = false;
        proc.kill = () => { proc.killed = true; };
        proc.stdout = new Readable({ read() {} });
        proc.stderr = new Readable({ read() {} });
        setImmediate(() => {
            if (step.bytes) proc.stdout.push(Buffer.alloc(step.bytes));
            if (step.stderr) proc.stderr.push(step.stderr);
            proc.stdout.push(null);
            proc.stderr.push(null);
            proc.emit('close', step.code ?? 0);
        });
        return proc;
    };
}

function make(plan, hooks = {}) {
    return createHealthMonitor({
        spawn: fakeSpawn(plan),
        ytdlpPath: 'yt-dlp',
        buildProbeArgs: (url) => ['-f', 'bestaudio', '-o', '-', url],
        onLog: () => {},
        ...hooks,
    });
}

test('Probe mit echten Bytes gilt als gesund', async () => {
    const mon = make([{ bytes: 128 * 1024 }]);
    await mon.runProbeNow();
    const h = mon.getHealth();
    assert.strictEqual(h.chain.healthy, true);
    assert.strictEqual(h.chain.consecutiveFailures, 0);
    assert.ok(h.chain.lastOkAt instanceof Date);
    mon.stop();
});

test('Exit-Code 0 OHNE Bytes ist ein Fehlschlag', async () => {
    // Genau die Falle: yt-dlp beendet sich sauber, hat aber nichts geladen.
    const mon = make([{ bytes: 0, code: 0, stderr: 'ERROR: unable to download video data: HTTP Error 403: Forbidden' }]);
    await mon.runProbeNow();
    const h = mon.getHealth();
    assert.notStrictEqual(h.chain.healthy, true);
    assert.match(h.chain.lastError, /403/);
    mon.stop();
});

test('erst die zweite Fehlprobe loest Alarm aus', async () => {
    const alerts = [];
    const mon = make([{ bytes: 0, code: 1, stderr: 'ProxyError' }],
        { notifyError: (title, err, ctx) => alerts.push({ title, msg: err.message, ctx }) });

    await mon.runProbeNow();
    assert.strictEqual(alerts.length, 0, 'ein einzelner Ausrutscher alarmiert nicht');
    assert.strictEqual(mon.getHealth().chain.healthy, null, 'noch kein Urteil');

    await mon.runProbeNow();
    assert.strictEqual(alerts.length, 1, 'beim zweiten Mal wird gemeldet');
    assert.match(alerts[0].title, /gestoert/i);
    assert.match(alerts[0].ctx, /Tunnel/i, 'der Alarm nennt, wo man nachsieht');
    assert.strictEqual(mon.getHealth().chain.healthy, false);
    mon.stop();
});

test('Dauerfehler meldet nur einmal, nicht bei jeder Probe', async () => {
    const alerts = [];
    const mon = make([{ bytes: 0, code: 1, stderr: 'ProxyError' }],
        { notifyError: () => alerts.push(1) });
    for (let i = 0; i < 5; i++) await mon.runProbeNow();
    assert.strictEqual(alerts.length, 1, `nur der Uebergang meldet, bekam ${alerts.length}`);
    mon.stop();
});

test('Erholung wird gemeldet — aber nur nach einer Stoerung', async () => {
    const infos = [];
    const mon = make(
        [{ bytes: 0, code: 1, stderr: 'ProxyError' }, { bytes: 0, code: 1, stderr: 'ProxyError' }, { bytes: 128 * 1024 }],
        { notifyError: () => {}, notifyInfo: (t) => infos.push(t) });

    await mon.runProbeNow();
    await mon.runProbeNow();
    assert.strictEqual(infos.length, 0);
    await mon.runProbeNow();
    assert.strictEqual(infos.length, 1, 'Entwarnung kommt');
    assert.match(infos[0], /wieder da/i);
    mon.stop();
});

test('erster Erfolg meldet keine Erholung', async () => {
    const infos = [];
    const mon = make([{ bytes: 128 * 1024 }], { notifyInfo: (t) => infos.push(t) });
    await mon.runProbeNow();
    assert.deepStrictEqual(infos, [], 'ohne vorherige Stoerung gibt es nichts zu entwarnen');
    mon.stop();
});

test('SoundCloud-Anteil ist der Fruehindikator', async () => {
    const mon = make([{ bytes: 128 * 1024 }]);
    // Drei YouTube-Tracks, dann kippt es auf SoundCloud
    mon.recordTrackStart({ firstAudioMs: 900, url: 'https://www.youtube.com/watch?v=a' });
    mon.recordTrackStart({ firstAudioMs: 1100, url: 'https://youtu.be/b' });
    mon.recordTrackStart({ firstAudioMs: 1000, url: 'https://www.youtube.com/watch?v=c' });
    assert.strictEqual(mon.getHealth().playback.soundcloudShare, 0);

    mon.recordTrackStart({ firstAudioMs: 1500, url: 'https://soundcloud.com/x/y' });
    const h = mon.getHealth();
    assert.strictEqual(h.playback.bySource.youtube, 3);
    assert.strictEqual(h.playback.bySource.soundcloud, 1);
    assert.strictEqual(h.playback.soundcloudShare, 0.25);
    assert.strictEqual(h.playback.firstAudioP50Ms, 1050, 'echter Median aus 900/1000/1100/1500');
    mon.stop();
});

test('Fehler werden nach Grund gebuendelt', async () => {
    const mon = make([{ bytes: 128 * 1024 }]);
    mon.recordStreamError('HTTP Error 403: Forbidden');
    mon.recordStreamError('HTTP Error 403: Forbidden');
    mon.recordStreamError('ProxyError');
    const h = mon.getHealth();
    assert.strictEqual(h.playback.streamErrors, 3);
    assert.strictEqual(h.playback.errorsByReason['HTTP Error 403: Forbidden'], 2);
    mon.stop();
});

test('statusLine bleibt vor der ersten Probe zurueckhaltend', async () => {
    const mon = make([{ bytes: 128 * 1024 }]);
    assert.match(mon.statusLine(), /geprüft/, 'nicht als kaputt melden, bevor gemessen wurde');
    await mon.runProbeNow();
    assert.match(mon.statusLine(), /🟢/);
    mon.stop();
});

test('ein haengendes yt-dlp laeuft in die Zeitueberschreitung statt zu blockieren', async () => {
    const mon = createHealthMonitor({
        spawn: () => {
            const proc = new EventEmitter();
            proc.killed = false;
            proc.kill = () => { proc.killed = true; };
            proc.stdout = new Readable({ read() {} });   // liefert nie etwas
            proc.stderr = new Readable({ read() {} });
            return proc;                                  // und endet nie
        },
        ytdlpPath: 'yt-dlp',
        buildProbeArgs: () => [],
        onLog: () => {},
        timeoutMs: 300,
    });
    const t0 = Date.now();
    await mon.runProbeNow();
    const took = Date.now() - t0;
    assert.ok(took >= 300 && took < 3000, `Abbruch nach der Zeitvorgabe erwartet, dauerte ${took} ms`);
    assert.notStrictEqual(mon.getHealth().chain.healthy, true);
    mon.stop();
});

// Der Messwert darf nur zaehlen, wenn die Wiedergabe traegt. Das prueft die
// Verdrahtung in index.js, nicht health.js — deshalb hier nur die Regel selbst
// als ausfuehrbare Dokumentation dessen, was recordTrackStart erwartet.
test('recordTrackStart ohne Traegerpruefung wuerde p50 verfaelschen', () => {
    const mon = make([{ bytes: 128 * 1024 }]);
    mon.recordTrackStart({ firstAudioMs: 900, url: 'https://youtu.be/a' });
    mon.recordTrackStart({ firstAudioMs: 1000, url: 'https://youtu.be/b' });
    const sauber = mon.getHealth().playback.firstAudioP50Ms;

    // So saehe es aus, wenn ein Playing-Flacker mitgezaehlt wuerde:
    mon.recordTrackStart({ firstAudioMs: 22000, url: 'https://youtu.be/kaputt' });
    const verfaelscht = mon.getHealth().playback.firstAudioP50Ms;

    assert.strictEqual(sauber, 950);
    assert.ok(verfaelscht > sauber, `ein Ausreisser zieht den p50 hoch (${sauber} -> ${verfaelscht})`);
    mon.stop();
});

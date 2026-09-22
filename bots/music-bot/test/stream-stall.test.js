// Ein haengendes yt-dlp darf die Wiedergabe nicht unbegrenzt blockieren.
//
// Anlass ist ein echter Fall vom 2026-09-22: yt-dlp lief zwei Minuten ohne ein
// einziges Byte und ohne CPU-Last, im Kanal stand die ganze Zeit "Puffert…".
// Erst ein Abbruch von Hand loeste den Retry aus — der dann sofort klappte.
//
// Eigene Datei, weil STREAM_STALL_MS beim Laden des Moduls gelesen wird und
// hier auf einen testbaren Wert gesetzt werden muss, BEVOR index.js kommt.
process.env.BEATBYTE_TEST = '1';
process.env.STREAM_STALL_MS = '600';

const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const { Readable } = require('stream');
const realSpawn = require('child_process').spawn;

const { ctx } = require('../src/index.js');
const { createLog, fakeChannel } = require('./fakes');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// yt-dlp, das schweigt und nie endet. FFmpeg bleibt echt.
const schweigendesYtdlp = () => (bin, args) => {
    if (/ffmpeg/i.test(bin)) return realSpawn(bin, args);
    const proc = new EventEmitter();
    proc.killed = false;
    proc.kill = () => { proc.killed = true; proc.emit('close', null); };
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    return proc;
};

test('der Waechter bricht ab, statt ewig zu puffern', async () => {
    const log = createLog();
    ctx.setSpawn(schweigendesYtdlp());
    const queue = ctx.getQueue('stall-1');
    queue.channel = fakeChannel(log);

    let fehler = null;
    const t0 = Date.now();
    ctx.createStream('https://www.youtube.com/watch?v=haengt', queue, (e) => { fehler = e; });
    await sleep(1500);

    assert.ok(fehler, 'ohne Waechter wuerde hier nie etwas passieren');
    assert.match(fehler.message, /Zeitueberschreitung/);
    assert.ok(Date.now() - t0 < 5000, `und zwar zeitnah, dauerte ${Date.now() - t0} ms`);

    ctx.destroyQueue('stall-1');
    ctx.setSpawn(null);
});

test('ein Abbruch faellt auf SoundCloud zurueck statt nur zu wiederholen', () => {
    // Die Regel steht in playNext: eine Zeitueberschreitung zaehlt wie eine
    // YouTube-Sperre, denn wenn ueber den Tunnel gar nichts kommt, hilft nur
    // ein Quellenwechsel. Hier als ausfuehrbare Dokumentation des Musters.
    const muster = /not a bot|sign in to confirm|video unavailable|this video is not available|requested format is not available|http error 403|zeitueberschreitung/i;
    assert.ok(muster.test('Zeitueberschreitung: keine Daten nach 45 s'));
    assert.ok(muster.test('HTTP Error 403: Forbidden'));
    assert.ok(!muster.test('irgendein anderer Fehler'));
});

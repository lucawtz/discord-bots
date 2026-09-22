// Prueft, dass Seek und Filterwechsel aus dem Mitschnitt kommen — also OHNE
// yt-dlp neu zu starten. Gegen den echten playNext, echtes FFmpeg, echten
// AudioPlayer; gefaelscht ist nur yt-dlp.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');

const { ctx } = require('../src/index.js');
const { createLog, fakeChannel, makeFakeSpawn } = require('./fakes');

const TRACK = { title: 'Testtrack', artist: 'A', url: 'https://www.youtube.com/watch?v=test1', duration: '2:32' };
const sleep = ms => new Promise(r => setTimeout(r, ms));


function freshQueue(log, guildId) {
    ctx.queues.delete(guildId);
    const queue = ctx.getQueue(guildId);
    queue.player = createAudioPlayer({ behaviors: { noSubscriberBehavior: NoSubscriberBehavior.Play } });
    queue.channel = fakeChannel(log);
    ctx.attachPlayerEvents(guildId, queue.player, queue);
    queue._seenStates = [];
    queue.player.on('stateChange', (_, n) => queue._seenStates.push(n.status));
    return queue;
}

function cleanup(guildId) {
    const q = ctx.queues.get(guildId);
    if (q) { q.player?.stop(true); ctx.destroyQueue(guildId); }
    ctx.setSpawn(null);
}

// Wartet, bis der Mitschnitt Daten hat.
async function waitForCache(queue, timeoutMs = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        if (queue._cache?.bytes > 0) return queue._cache;
        await sleep(100);
    }
    return null;
}

test('der laufende Track wird mitgeschnitten', async () => {
    const guildId = 'cache-1';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK });

    await ctx.playNext(guildId);
    const cache = await waitForCache(queue);

    assert.ok(cache, 'Mitschnitt muss angelegt werden');
    assert.ok(cache.bytes > 0, `es muessen Bytes ankommen, waren ${cache?.bytes}`);
    assert.ok(fs.existsSync(cache.file), 'die Datei muss existieren');
    cleanup(guildId);
});

test('Filterwechsel startet KEIN neues yt-dlp', async () => {
    const guildId = 'cache-2';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK });

    await ctx.playNext(guildId);
    await waitForCache(queue);
    await sleep(600); // etwas Wiedergabe, damit der Mitschnitt vollstaendig ist

    const ytdlpBefore = log.find('yt-dlp.stream').length;
    assert.strictEqual(ytdlpBefore, 1, 'bis hierhin genau ein Download');

    queue.filter = 'bassboost';
    const ok = ctx.restartCurrentWithFilter(queue);
    assert.strictEqual(ok, true);
    await sleep(400);

    assert.strictEqual(log.find('yt-dlp.stream').length, ytdlpBefore,
        'der Filterwechsel darf den Song NICHT erneut durch den Tunnel ziehen');
    cleanup(guildId);
});

test('Lautstaerkewechsel ebenso — das trifft der Web-Player-Regler', async () => {
    const guildId = 'cache-3';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK });

    await ctx.playNext(guildId);
    await waitForCache(queue);
    await sleep(600);

    const before = log.find('yt-dlp.stream').length;
    for (const v of [0.8, 0.6, 0.4]) {
        queue.volume = v;
        ctx.restartCurrentWithFilter(queue);
        await sleep(200);
    }
    assert.strictEqual(log.find('yt-dlp.stream').length, before,
        'drei Reglerbewegungen, kein einziger neuer Download');
    cleanup(guildId);
});

test('Sprung zurueck kommt aus dem Mitschnitt, Sprung weit nach vorn nicht', async () => {
    const guildId = 'cache-4';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK });

    await ctx.playNext(guildId);
    const cache = await waitForCache(queue);
    await sleep(600);

    // Der Testton ist nach ~3 s zu Ende -> complete. Dann ist jede Stelle drin.
    if (cache.complete) {
        assert.ok(ctx.cachedSourceFor(queue, 150), 'bei vollstaendigem Mitschnitt zaehlt jede Stelle');
    }

    // Kuenstlich unvollstaendig: nur bis zur gespielten Stelle gilt als sicher
    cache.complete = false;
    assert.ok(ctx.cachedSourceFor(queue, 0), 'Anfang ist immer abgedeckt');
    assert.strictEqual(ctx.cachedSourceFor(queue, 9999), null,
        'weit nach vorn ist NICHT abgedeckt — dort muss das Netz ran');
    cleanup(guildId);
});

test('Mitschnitt verschwindet beim Trackwechsel und beim Abbau', async () => {
    const guildId = 'cache-5';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK }, { ...TRACK, title: 'Zweiter' });

    await ctx.playNext(guildId);
    const first = await waitForCache(queue);
    const firstFile = first.file;
    await sleep(300);

    await ctx.playNext(guildId);          // naechster Track
    await sleep(300);
    assert.ok(!fs.existsSync(firstFile), 'die alte Datei muss weg sein');

    const second = await waitForCache(queue);
    const secondFile = second?.file;
    ctx.destroyQueue(guildId);
    await sleep(200);
    if (secondFile) assert.ok(!fs.existsSync(secondFile), 'beim Abbau ebenfalls');
    ctx.setSpawn(null);
});

test('ohne Mitschnitt liefert cachedSourceFor null statt zu werfen', () => {
    const queue = ctx.getQueue('cache-6');
    assert.strictEqual(ctx.cachedSourceFor(queue, 10), null);
    ctx.dropTrackCache(queue);   // darf auch ohne Mitschnitt laufen
    ctx.queues.delete('cache-6');
});

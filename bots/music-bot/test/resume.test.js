// Prueft, dass eine laufende Wiedergabe einen Neustart uebersteht — und dass
// sie es in den Faellen NICHT tut, in denen das falsch waere.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');

const { ctx } = require('../src/index.js');
const { createLog, fakeChannel, makeFakeSpawn } = require('./fakes');

const TRACK = { title: 'Testtrack', artist: 'A', url: 'https://www.youtube.com/watch?v=test1', duration: '2:32', durationSec: 152 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Nur so viel Verbindung, wie Snapshot und Abbau anfassen.
const fakeConnection = (channelId) => ({
    joinConfig: { channelId },
    removeAllListeners() {},
    destroy() {},
});

// Die DB wird hier nicht gebraucht: snapshotQueue ist reine Zustandsbildung.
function queueWithPlayback(log, guildId, { channelId = 'vc-1', elapsedSec = 0 } = {}) {
    ctx.queues.delete(guildId);
    const queue = ctx.getQueue(guildId);
    queue.player = createAudioPlayer({ behaviors: { noSubscriberBehavior: NoSubscriberBehavior.Play } });
    queue.channel = { ...fakeChannel(log), id: 'text-1' };
    // So sieht eine bestehende Voice-Verbindung fuer den Snapshot aus.
    queue.connection = fakeConnection(channelId);
    queue.current = { ...TRACK };
    queue._playbackStart = Date.now() - elapsedSec * 1000;
    queue._seekOffset = 0;
    return queue;
}

test('ohne Verbindung oder ohne Track gibt es nichts zu sichern', () => {
    const log = createLog();
    const q = queueWithPlayback(log, 'res-0');
    q.connection = null;
    assert.strictEqual(ctx.snapshotQueue('res-0'), null, 'ohne Voice-Verbindung kein Zustand');

    q.connection = fakeConnection('vc-1');
    q.current = null;
    assert.strictEqual(ctx.snapshotQueue('res-0'), null, 'ohne laufenden Track kein Zustand');
    ctx.queues.delete('res-0');
});

test('der Zustand enthaelt alles zum Weiterspielen', () => {
    const log = createLog();
    const q = queueWithPlayback(log, 'res-1', { elapsedSec: 42 });
    q.tracks.push({ ...TRACK, title: 'Naechster' });
    q.loopMode = 'queue';
    q.volume = 0.6;
    q.filter = 'bassboost';
    q.autoDj = true;

    const snap = ctx.snapshotQueue('res-1');
    assert.strictEqual(snap.voiceChannelId, 'vc-1');
    assert.strictEqual(snap.textChannelId, 'text-1');
    assert.strictEqual(snap.current.title, 'Testtrack');
    assert.ok(snap.positionSec >= 41 && snap.positionSec <= 44, `Position ~42s, war ${snap.positionSec}`);
    assert.strictEqual(snap.tracks.length, 1);
    assert.strictEqual(snap.tracks[0].title, 'Naechster');
    assert.strictEqual(snap.loopMode, 'queue');
    assert.strictEqual(snap.volume, 0.6);
    assert.strictEqual(snap.filter, 'bassboost');
    assert.strictEqual(snap.autoDj, true);
    assert.ok(snap.savedAt > 0);
    ctx.queues.delete('res-1');
});

test('der Zustand traegt keine Nachrichten-Objekte mit sich', () => {
    const log = createLog();
    const q = queueWithPlayback(log, 'res-2');
    q.current._resource = { huge: true };
    q._nowPlayingMsg = { id: 'm1', edit: () => {}, delete: () => {} };

    const snap = ctx.snapshotQueue('res-2');
    const json = JSON.stringify(snap);
    assert.ok(!json.includes('nowPlayingMsg'), 'Player-Karte wird nach dem Neustart neu gesendet');
    assert.ok(!('_resource' in snap.current), 'kein Audio-Objekt im Zustand');
    // Muss sich ueberhaupt serialisieren lassen — sonst scheitert das Speichern.
    assert.doesNotThrow(() => JSON.parse(json));
    ctx.queues.delete('res-2');
});

test('ein vorhandener Mitschnitt wird vermerkt — daran haengt, ob Fortsetzen Netz kostet', async () => {
    const guildId = 'res-3';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 30 }));

    ctx.queues.delete(guildId);
    const queue = ctx.getQueue(guildId);
    queue.player = createAudioPlayer({ behaviors: { noSubscriberBehavior: NoSubscriberBehavior.Play } });
    queue.channel = { ...fakeChannel(log), id: 'text-1' };
    ctx.attachPlayerEvents(guildId, queue.player, queue);
    queue.tracks.push({ ...TRACK });
    await ctx.playNext(guildId);
    await sleep(700);
    queue.connection = fakeConnection('vc-1');

    const snap = ctx.snapshotQueue(guildId);
    assert.ok(snap.cacheFile, 'der Mitschnitt gehoert in den Zustand');
    assert.ok(fs.existsSync(snap.cacheFile), 'und muss auch existieren');
    // Er liegt im Daten-Volume, nicht in /tmp — sonst ueberlebt er den Deploy nicht.
    assert.ok(!snap.cacheFile.startsWith(os.tmpdir()),
        `Mitschnitt muss im Datenverzeichnis liegen, war: ${snap.cacheFile}`);
    assert.match(snap.cacheFile.replace(/\\/g, '/'), /\/data\/cache\//);

    ctx.destroyQueue(guildId);
    ctx.setSpawn(null);
});

test('sweepCacheDir raeumt Altlasten weg, verschont Frisches', () => {
    const dir = path.join(__dirname, '..', 'data', 'cache');
    fs.mkdirSync(dir, { recursive: true });
    const alt = path.join(dir, 'uralt-test.audio');
    const neu = path.join(dir, 'frisch-test.audio');
    fs.writeFileSync(alt, 'x');
    fs.writeFileSync(neu, 'x');
    const zweiTageAlt = Date.now() - 2 * 24 * 3600_000;
    fs.utimesSync(alt, zweiTageAlt / 1000, zweiTageAlt / 1000);

    ctx.sweepCacheDir();

    assert.ok(!fs.existsSync(alt), 'zwei Tage alt -> weg');
    assert.ok(fs.existsSync(neu), 'frisch -> bleibt');
    fs.unlinkSync(neu);
});

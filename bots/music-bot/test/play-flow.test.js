// Prueft die /play-Choreografie gegen den ECHTEN Bot-Code.
//   node --test test/
// Gefaelscht sind nur Discord und yt-dlp. FFmpeg, der AudioPlayer und die
// komplette playNext-Logik laufen echt — bis zum ersten Opus-Frame.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const { createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');

const { ctx } = require('../src/index.js');
const play = require('../src/commands/play.js');
const { createLog, fakeInteraction, fakeChannel, makeFakeSpawn } = require('./fakes');

const TRACK = { title: 'G Wagon', artist: 'Gzuz', url: 'https://www.youtube.com/watch?v=test1', duration: '2:32', durationSec: 152 };
const META = { title: 'G Wagon', artist: 'Gzuz', duration: '2:32', durationSec: 152, albumArt: 'https://example/cover.jpg' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Frische Queue mit einem Player, der ohne Voice-Verbindung wirklich abspielt.
function freshQueue(log, guildId) {
    ctx.queues.delete(guildId);
    const queue = ctx.getQueue(guildId);
    queue.player = createAudioPlayer({ behaviors: { noSubscriberBehavior: NoSubscriberBehavior.Play } });
    queue.channel = fakeChannel(log);
    ctx.attachPlayerEvents(guildId, queue.player, queue);
    // Ohne Voice-Verbindung faellt der Player nach dem Start auf "autopaused"
    // zurueck. Entscheidend ist, dass er ueberhaupt Playing ERREICHT hat —
    // genau daran haengt der Kartenwechsel.
    queue._seenStates = [];
    queue.player.on('stateChange', (_, next) => queue._seenStates.push(next.status));
    return queue;
}

const reachedPlaying = (queue) => queue._seenStates.includes(AudioPlayerStatus.Playing);

// ctx mit ausgetauschten Aussenkanten: Deezer und Quellensuche liefern feste
// Werte, alles andere (playNext, createStream, Embeds) bleibt der echte Code.
function testCtx(overrides = {}) {
    return {
        ...ctx,
        ensureConnection: async () => {},
        quickMeta: async () => ({ ...META }),
        searchTrack: async () => ({ ...TRACK }),
        ensureAlbumArt: async () => {},
        ...overrides,
    };
}

function cleanup(guildId) {
    const q = ctx.queues.get(guildId);
    if (q) { q.player?.stop(true); ctx.queues.delete(guildId); }
    ctx.setSpawn(null);
}

test('nichts laeuft: eine Nachricht, drei Zustaende, kein Loeschen', async () => {
    const guildId = 'guild-flow';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 150 }));
    const queue = freshQueue(log, guildId);

    const interaction = fakeInteraction(log, { query: 'g wagon gzuz' });
    interaction.guildId = guildId;
    interaction.guild = { id: guildId };

    await play.execute(interaction, testCtx());
    await sleep(1500); // Extraktion + FFmpeg + erster Opus-Frame

    const ops = log.ops();
    assert.ok(!ops.includes('deleteReply'), `Antwort darf nicht geloescht werden:\n${log.dump()}`);
    assert.strictEqual(log.find('channel.send').length, 0, `keine zweite Nachricht im Kanal:\n${log.dump()}`);

    // Zustand 1: Sofort-Karte aus Deezer, Zustand 2: Player-Karte, beide als editReply
    const edits = log.find('editReply');
    assert.ok(edits.length >= 2, `mindestens Sofort- und Player-Karte erwartet:\n${log.dump()}`);
    assert.match(edits[0].detail, /Lädt/, 'erster Zustand ist die Lade-Karte');

    // Zustand 3: Wiedergabe laeuft, Karte steht auf "Spielt jetzt"
    assert.ok(reachedPlaying(queue), `Audio hat wirklich gestartet (Zustaende: ${queue._seenStates.join(' -> ')})`);
    assert.strictEqual(queue._npLoading, false, 'Puffer-Zustand beendet');
    const last = log.entries.filter(e => e.op === 'editReply' || e.op === 'message.edit').pop();
    assert.match(last.detail, /Spielt jetzt/, `letzter Zustand ist "Spielt jetzt":\n${log.dump()}`);

    cleanup(guildId);
});

test('Sofort-Karte kommt vor der Quellensuche', async () => {
    const guildId = 'guild-order';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 50 }));
    freshQueue(log, guildId);

    const interaction = fakeInteraction(log, { query: 'g wagon gzuz' });
    interaction.guildId = guildId;
    interaction.guild = { id: guildId };

    // Quellensuche dauert 800ms, Deezer 50ms -> die Karte muss zuerst stehen
    await play.execute(interaction, testCtx({
        quickMeta: async () => { await sleep(50); return { ...META }; },
        searchTrack: async () => { await sleep(800); return { ...TRACK }; },
    }));

    const ops = log.ops();
    assert.ok(ops.indexOf('editReply') < ops.indexOf('yt-dlp.stream'),
        `Karte muss vor dem Streaming stehen:\n${log.dump()}`);

    await sleep(600);
    cleanup(guildId);
});

test('Quellensuche schneller als Deezer: Reihenfolge kippt nicht', async () => {
    const guildId = 'guild-race';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 20 }));
    freshQueue(log, guildId);

    const interaction = fakeInteraction(log, { query: 'g wagon gzuz' });
    interaction.guildId = guildId;
    interaction.guild = { id: guildId };

    // Cache-Treffer: Suche in 10ms fertig, Deezer braucht 400ms
    await play.execute(interaction, testCtx({
        quickMeta: async () => { await sleep(400); return { title: 'VERALTET', artist: 'x', duration: '0:10' }; },
        searchTrack: async () => { await sleep(10); return { ...TRACK }; },
    }));
    await sleep(900); // lange genug, dass die verspaetete Sofort-Karte da waere

    const texts = log.entries.filter(e => e.op === 'editReply' || e.op === 'message.edit').map(e => e.detail);
    assert.ok(!texts.some(t => t.includes('VERALTET')),
        `verspaetete Sofort-Karte darf die Player-Karte nicht ueberschreiben:\n${log.dump()}`);

    cleanup(guildId);
});

test('kein Voice-Channel: ephemer und ohne Defer', async () => {
    const log = createLog();
    const interaction = fakeInteraction(log, { query: 'g wagon', inVoice: false });
    await play.execute(interaction, testCtx());

    assert.deepStrictEqual(log.ops(), ['reply.ephemeral'], log.dump());
});

test('Suche scheitert: Fehler ersetzt die Sofort-Karte', async () => {
    const guildId = 'guild-fail';
    const log = createLog();
    freshQueue(log, guildId);

    const interaction = fakeInteraction(log, { query: 'asdkjhasd' });
    interaction.guildId = guildId;
    interaction.guild = { id: guildId };

    await play.execute(interaction, testCtx({
        searchTrack: async () => { await sleep(100); throw new Error('Kein Ergebnis gefunden'); },
    }));
    await sleep(200);

    const last = log.find('editReply').pop();
    assert.match(last.detail, /Kein Ergebnis gefunden/, log.dump());
    cleanup(guildId);
});

test('Track aus der Queue (Skip): Karte geht in den Kanal, nicht an die Interaction', async () => {
    const guildId = 'guild-skip';
    const log = createLog();
    ctx.setSpawn(makeFakeSpawn(log, { audioDelayMs: 50 }));
    const queue = freshQueue(log, guildId);
    queue.tracks.push({ ...TRACK });

    await ctx.playNext(guildId);
    await sleep(1200);

    assert.strictEqual(log.find('channel.send').length, 1, `eine Kanalnachricht erwartet:\n${log.dump()}`);
    assert.strictEqual(log.find('editReply').length, 0, 'ohne Interaction keine editReply');
    assert.ok(reachedPlaying(queue), `Audio hat wirklich gestartet (Zustaende: ${queue._seenStates.join(' -> ')})`);
    cleanup(guildId);
});

test('Autocomplete liefert Vorschlaege und waermt den Cache vor', async () => {
    const log = createLog();
    const interaction = fakeInteraction(log, { query: 'g wagon gz' });
    const warmed = [];

    await play.autocomplete(interaction, testCtx({
        deezerSuggest: async () => [{ title: 'G Wagon', artist: 'Gzuz', duration: '2:32', durationSec: 152, query: 'Gzuz G Wagon' }],
        preResolveTrack: (q) => warmed.push(q),
    }));

    assert.strictEqual(log.find('autocomplete').length, 1, log.dump());
    assert.match(log.find('autocomplete')[0].detail, /G Wagon — Gzuz · 2:32/);
    assert.deepStrictEqual(warmed, ['Gzuz G Wagon'], 'Top-Treffer wird vorab aufgeloest');
});

test('Autocomplete ignoriert URLs und zu kurze Eingaben', async () => {
    const log = createLog();
    for (const q of ['a', 'https://youtu.be/x']) {
        const interaction = fakeInteraction(log, { query: q });
        await play.autocomplete(interaction, testCtx({
            deezerSuggest: async () => { throw new Error('darf nicht aufgerufen werden'); },
        }));
    }
    assert.deepStrictEqual(log.find('autocomplete').map(e => e.detail), ['', ''], log.dump());
});

// Prueft den Lavalink-Client gegen einen echten, aber gefaelschten Lavalink-
// Server: Handshake, Laden, Voice-Weiterleitung, Steuerbefehle, Resumption.
// Kein Java, kein Discord, kein Netz.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const { LavalinkNode, buildFilters } = require('../src/audio/lavalink');
const { startFakeLavalink } = require('./fake-lavalink');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withNode(fn, { userId = '999' } = {}) {
    const server = await startFakeLavalink();
    const sent = [];
    const node = new LavalinkNode({
        host: '127.0.0.1', port: server.port, password: 'probe', userId,
        sendGateway: (guildId, payload) => sent.push({ guildId, payload }),
    });
    const ready = new Promise(r => node.once('ready', r));
    node.connect();
    const readyInfo = await ready;
    try { await fn({ node, server, sent, readyInfo }); }
    finally { node.destroy(); await server.close(); }
}

test('Handshake schickt Passwort, User-Id und Client-Name', async () => {
    await withNode(async ({ server, readyInfo, node }) => {
        assert.strictEqual(server.handshakes.length, 1);
        assert.strictEqual(server.handshakes[0].auth, 'probe');
        assert.strictEqual(server.handshakes[0].userId, '999');
        assert.match(server.handshakes[0].clientName, /BeatByte/);
        assert.strictEqual(readyInfo.sessionId, 'sess-1');
        assert.strictEqual(node.sessionId, 'sess-1');
    });
});

test('nach ready wird Resumption aktiviert', async () => {
    await withNode(async ({ server }) => {
        await sleep(80);
        const patch = server.find('/v4/sessions/sess-1').find(c => c.method === 'PATCH');
        assert.ok(patch, `Session-PATCH erwartet, bekam: ${JSON.stringify(server.calls)}`);
        assert.strictEqual(patch.body.resuming, true);
        assert.strictEqual(patch.body.timeout, 60);
    });
});

test('loadTracks uebersetzt alle loadTypes', async () => {
    await withNode(async ({ node, server }) => {
        const search = await node.loadTracks('ytsearch:g wagon');
        assert.strictEqual(search.loadType, 'search');
        assert.strictEqual(search.tracks[0].info.title, 'G Wagon');

        server.setLoadResponse({ loadType: 'track', data: server.TRACK });
        assert.strictEqual((await node.loadTracks('https://x')).tracks.length, 1);

        server.setLoadResponse({ loadType: 'playlist', data: { info: { name: 'Mix' }, tracks: [server.TRACK, server.TRACK] } });
        const pl = await node.loadTracks('https://list');
        assert.strictEqual(pl.tracks.length, 2);
        assert.strictEqual(pl.playlist.name, 'Mix');

        server.setLoadResponse({ loadType: 'empty', data: {} });
        assert.deepStrictEqual((await node.loadTracks('nix')).tracks, []);

        server.setLoadResponse({ loadType: 'error', data: { message: 'Something went wrong' } });
        const err = await node.loadTracks('kaputt');
        assert.strictEqual(err.loadType, 'error');
        assert.match(err.error, /Something went wrong/);
    });
});

test('joinVoice schickt OP 4 mit selfDeaf', async () => {
    await withNode(async ({ node, sent }) => {
        node.joinVoice('g1', 'vc1');
        assert.strictEqual(sent.length, 1);
        assert.strictEqual(sent[0].payload.op, 4);
        assert.strictEqual(sent[0].payload.d.channel_id, 'vc1');
        assert.strictEqual(sent[0].payload.d.self_deaf, true);

        node.leaveVoice('g1');
        assert.strictEqual(sent[1].payload.d.channel_id, null);
    });
});

test('Voice-Credentials gehen erst raus, wenn BEIDE Haelften da sind', async () => {
    await withNode(async ({ node, server }) => {
        // Nur der State — Lavalink darf noch nichts bekommen
        node.handleVoiceState({ guild_id: 'g1', user_id: '999', channel_id: 'vc1', session_id: 'vsess' });
        await sleep(50);
        assert.strictEqual(server.find('/players/g1').length, 0, 'ohne Server-Update noch kein PATCH');

        // Jetzt die zweite Haelfte
        node.handleVoiceServer({ guild_id: 'g1', token: 'vtoken', endpoint: 'eu-west123.discord.media:443' });
        await sleep(80);
        const patch = server.find('/players/g1')[0];
        assert.ok(patch, 'PATCH mit Voice-Daten erwartet');
        // channelId gehoert dazu: Lavalink 4.2 lehnt das Voice-Objekt sonst mit
        // einem nackten 400 ab, dessen Grund nur im Server-Log steht.
        assert.deepStrictEqual(patch.body.voice, {
            token: 'vtoken', endpoint: 'eu-west123.discord.media:443', sessionId: 'vsess',
            channelId: 'vc1',
        });
    });
});

test('fremde Voice-States werden ignoriert', async () => {
    await withNode(async ({ node, server }) => {
        node.handleVoiceState({ guild_id: 'g1', user_id: '12345', channel_id: 'vc1', session_id: 'fremd' });
        node.handleVoiceServer({ guild_id: 'g1', token: 't', endpoint: 'e' });
        await sleep(80);
        assert.strictEqual(server.find('/players/g1').length, 0, 'nur der eigene Bot zaehlt');
    });
});

test('Steuerbefehle erzeugen die richtigen REST-Aufrufe', async () => {
    await withNode(async ({ node, server }) => {
        await node.play('g1', 'ENCODED');
        await node.pause('g1', true);
        await node.seek('g1', 120_000);
        await node.setVolume('g1', 50);
        await node.setFilters('g1', buildFilters({ filter: 'nightcore' }));
        await node.stop('g1');

        const bodies = server.find('/players/g1').map(c => c.body);
        assert.deepStrictEqual(bodies[0].track, { encoded: 'ENCODED' });
        assert.strictEqual(bodies[1].paused, true);
        assert.strictEqual(bodies[2].position, 120000, 'Seek als Position, kein Neu-Laden');
        assert.strictEqual(bodies[3].volume, 50);
        assert.deepStrictEqual(bodies[4].filters.timescale, { speed: 1.15, pitch: 1.15, rate: 1 });
        assert.deepStrictEqual(bodies[5].track, { encoded: null });
    });
});

test('Lautstaerke wird auf 0..1000 begrenzt', async () => {
    await withNode(async ({ node, server }) => {
        await node.setVolume('g1', 5000);
        await node.setVolume('g1', -20);
        const bodies = server.find('/players/g1').map(c => c.body);
        assert.strictEqual(bodies[0].volume, 1000);
        assert.strictEqual(bodies[1].volume, 0);
    });
});

test('Track-Events kommen als eigene Events an', async () => {
    await withNode(async ({ node, server }) => {
        const got = [];
        node.on('TrackStartEvent', e => got.push(['start', e.track?.info?.title]));
        node.on('TrackEndEvent', e => got.push(['end', e.reason]));
        node.on('TrackStuckEvent', () => got.push(['stuck']));

        server.emit({ op: 'event', type: 'TrackStartEvent', guildId: 'g1', track: server.TRACK });
        server.emit({ op: 'event', type: 'TrackEndEvent', guildId: 'g1', reason: 'finished' });
        server.emit({ op: 'event', type: 'TrackStuckEvent', guildId: 'g1', thresholdMs: 10000 });
        await sleep(80);

        assert.deepStrictEqual(got, [['start', 'G Wagon'], ['end', 'finished'], ['stuck']]);
    });
});

test('playerUpdate pflegt die Position', async () => {
    await withNode(async ({ node, server }) => {
        await node.play('g1', 'ENCODED');
        server.emit({ op: 'playerUpdate', guildId: 'g1', state: { position: 42_000, connected: true, ping: 20 } });
        await sleep(80);
        const p = node.players.get('g1');
        assert.strictEqual(p.position, 42000);
        assert.strictEqual(p.connectedToVoice, true);
    });
});

test('Verbindungsabbruch: Reconnect meldet sich mit Session-Id (Resumption)', async () => {
    const server = await startFakeLavalink();
    const node = new LavalinkNode({
        host: '127.0.0.1', port: server.port, password: 'probe', userId: '999',
        sendGateway: () => {},
    });
    try {
        await new Promise(r => { node.once('ready', r); node.connect(); });
        assert.strictEqual(server.handshakes[0].resumeSession, null, 'erster Handshake ohne Session-Id');

        const reconnected = new Promise(r => node.once('ready', r));
        server.dropConnections();
        const info = await Promise.race([reconnected, sleep(8000).then(() => null)]);

        assert.ok(info, 'Client muss sich neu verbinden');
        assert.strictEqual(server.handshakes.length, 2);
        assert.strictEqual(server.handshakes[1].resumeSession, 'sess-1',
            'zweiter Handshake muss die Session fortsetzen — sonst stirbt die Wiedergabe beim Bot-Neustart');
        assert.strictEqual(info.resumed, true);
    } finally { node.destroy(); await server.close(); }
});

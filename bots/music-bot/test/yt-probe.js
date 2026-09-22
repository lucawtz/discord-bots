// Welche YouTube-Tracks spielt Lavalink wirklich? Trennt "dieser Track ist
// gesperrt" von "YouTube-Auth fehlt generell".
const path = require('path');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { LavalinkNode } = require('../src/audio/lavalink');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const argOf = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const LL_PORT = Number(argOf('lavalink-port', 2333));
const POT = argOf('pot-provider', null);
const rest = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
const QUERIES = rest.length ? rest : [
    'Rick Astley Never Gonna Give You Up',   // Offiziell, weltweit, Evergreen
    'Queen Bohemian Rhapsody official',      // Offiziell, Major Label
    'Gzuz G Wagon',                          // Der Fall aus dem Bugreport
    'lofi hip hop radio beats',              // Kein Label
];

(async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    await client.login(process.env.DISCORD_TOKEN);
    await new Promise(r => client.once(Events.ClientReady, r));
    const node = new LavalinkNode({
        host: '127.0.0.1', port: LL_PORT, password: process.env.LAVALINK_PASSWORD || 'probe', userId: client.user.id,
        sendGateway: (gid, p) => client.guilds.cache.get(gid)?.shard.send(p),
    });
    client.on(Events.Raw, (p) => {
        if (p.t === 'VOICE_STATE_UPDATE') node.handleVoiceState(p.d);
        if (p.t === 'VOICE_SERVER_UPDATE') node.handleVoiceServer(p.d);
    });
    await new Promise(r => { node.once('ready', r); node.connect(); });
    if (POT) {
        const { fetchVisitorData, mintPoToken } = require('../src/audio/potoken');
        const minted = await mintPoToken(POT, await fetchVisitorData());
        await node.setYoutubeConfig({ poToken: minted.poToken, visitorData: minted.visitorData });
        console.log(`poToken gesetzt (${minted.poToken.length} Zeichen)`);
    }

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const vc = channels.find(c => c?.isVoiceBased() && c.permissionsFor(guild.members.me).has('Connect'));
    node.joinVoice(guild.id, vc.id);
    await sleep(3000);
    console.log('Voice verbunden:', node.players.get(guild.id)?.connectedToVoice, '\n');

    for (const q of QUERIES) {
        let exception = null;
        const onExc = (e) => { exception = e.exception?.message || e.exception?.cause; };
        node.once('TrackExceptionEvent', onExc);

        const loaded = await node.loadTracks(`ytsearch:${q}`);
        if (!loaded.tracks.length) { console.log(`✗ ${q}\n    laden: ${loaded.error || loaded.loadType}\n`); continue; }
        const t = loaded.tracks[0];

        const before = node.players.get(guild.id)?.position ?? 0;
        await node.play(guild.id, t.encoded).catch(e => { exception = e.message; });
        await sleep(4000);
        const after = node.players.get(guild.id)?.position ?? 0;
        const plays = after > before + 500 || after > 500;

        console.log(`${plays ? '✓' : '✗'} ${q}`);
        console.log(`    "${t.info.title}" — ${t.info.author}`);
        console.log(`    ${plays ? `spielt (Position ${after}ms)` : `KEIN TON: ${(exception || 'Position blieb stehen').split('\n')[0].slice(0, 110)}`}\n`);
        node.off('TrackExceptionEvent', onExc);
        await node.stop(guild.id).catch(() => {});
        await sleep(300);
    }

    await node.destroyPlayer(guild.id); node.leaveVoice(guild.id);
    await sleep(500); node.destroy(); await client.destroy(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

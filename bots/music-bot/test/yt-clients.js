// Diagnose: WELCHER YouTube-Client scheitert WORAN — mit und ohne poToken.
// Die Sammelmeldung "All clients failed to load the item" verschweigt genau das.
//   node test/yt-clients.js [--pot-provider http://127.0.0.1:4416]
const path = require('path');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { LavalinkNode } = require('../src/audio/lavalink');
const { fetchVisitorData, mintPoToken } = require('../src/audio/potoken');

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const POT = arg('pot-provider', null);
const QUERY = arg('query', 'Gzuz G Wagon');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    await client.login(process.env.DISCORD_TOKEN);
    await new Promise(r => client.once(Events.ClientReady, r));

    const node = new LavalinkNode({
        host: '127.0.0.1', port: Number(arg('lavalink-port', 2333)), password: 'probe', userId: client.user.id,
        sendGateway: (gid, p) => client.guilds.cache.get(gid)?.shard.send(p),
    });
    client.on(Events.Raw, (p) => {
        if (p.t === 'VOICE_STATE_UPDATE') node.handleVoiceState(p.d);
        if (p.t === 'VOICE_SERVER_UPDATE') node.handleVoiceServer(p.d);
    });
    await new Promise(r => { node.once('ready', r); node.connect(); });

    if (POT) {
        const visitorData = await fetchVisitorData();
        const minted = await mintPoToken(POT, visitorData);
        await node.setYoutubeConfig({ poToken: minted.poToken, visitorData: minted.visitorData });
        console.log(`poToken gesetzt (${minted.poToken.length} Zeichen)\n`);
    } else {
        console.log('ohne poToken\n');
    }

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const vc = channels.find(c => c?.isVoiceBased() && c.permissionsFor(guild.members.me).has('Connect'));
    node.joinVoice(guild.id, vc.id);
    await sleep(2500);

    let exception = null;
    node.on('TrackExceptionEvent', e => { exception = e.exception; });

    const loaded = await node.loadTracks(`ytsearch:${QUERY}`);
    const track = loaded.tracks[0];
    console.log(`Track: "${track.info.title}" — ${track.info.author}\n`);

    await node.play(guild.id, track.encoded).catch(e => { exception = { message: e.message }; });
    await sleep(6000);

    const pos = node.players.get(guild.id)?.position ?? 0;
    if (pos > 500) {
        console.log(`✓ SPIELT (Position ${pos}ms)`);
    } else {
        const full = [exception?.message, exception?.cause, exception?.causeStackTrace].filter(Boolean).join('\n');
        console.log('✗ KEIN TON. Fehler pro Client:\n');
        // Jede "Client [X] failed: Grund"-Zeile einzeln zeigen
        const perClient = full.split('\n').filter(l => /Client \[/.test(l));
        if (perClient.length) perClient.forEach(l => console.log('   ' + l.trim()));
        else console.log(full.split('\n').slice(0, 12).map(l => '   ' + l).join('\n'));
    }

    await node.destroyPlayer(guild.id); node.leaveVoice(guild.id);
    await sleep(400); node.destroy(); await client.destroy(); process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });

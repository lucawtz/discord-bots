// Isoliert die Voice-Verbindung vom YouTube-Problem: spielt eine lokale
// Audiodatei ueber Lavalinks http-Quelle statt YouTube.
const path = require('path');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));
const http = require('http');
const fs = require('fs');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { LavalinkNode } = require('../src/audio/lavalink');
const { ensureTone } = require('./fakes');

const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const tone = ensureTone();
    const srv = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'audio/ogg', 'Content-Length': fs.statSync(tone).size });
        fs.createReadStream(tone).pipe(res);
    });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${srv.address().port}/tone.ogg`;
    console.log('Datei-Quelle:', url);

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    await client.login(process.env.DISCORD_TOKEN);
    await new Promise(r => client.once(Events.ClientReady, r));

    const node = new LavalinkNode({
        host: '127.0.0.1', port: 2333, password: 'probe', userId: client.user.id,
        sendGateway: (gid, p) => client.guilds.cache.get(gid)?.shard.send(p),
    });
    client.on(Events.Raw, (p) => {
        if (p.t === 'VOICE_STATE_UPDATE') node.handleVoiceState(p.d);
        if (p.t === 'VOICE_SERVER_UPDATE') { console.log('VOICE_SERVER_UPDATE endpoint=', p.d.endpoint); node.handleVoiceServer(p.d); }
    });
    node.on('error', e => console.log('  [lavalink-fehler]', e.message));
    await new Promise(r => { node.once('ready', r); node.connect(); });

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const vc = channels.find(c => c?.isVoiceBased() && c.permissionsFor(guild.members.me).has('Connect'));

    const loaded = await node.loadTracks(url);
    console.log('loadTracks:', loaded.loadType, loaded.tracks[0]?.info?.title, loaded.error || '');

    node.joinVoice(guild.id, vc.id);
    await sleep(3000);
    console.log('connected:', node.players.get(guild.id)?.connectedToVoice);

    if (loaded.tracks[0]) {
        await node.play(guild.id, loaded.tracks[0].encoded).catch(e => console.log('  play-Fehler:', e.message));
        await sleep(2500);
        console.log('Position nach 2.5s:', node.players.get(guild.id)?.position, 'ms');
    }
    await node.destroyPlayer(guild.id); node.leaveVoice(guild.id);
    await sleep(500); node.destroy(); srv.close(); await client.destroy(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

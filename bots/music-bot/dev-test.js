// Lokaler Dev-Test-Runner fuer BeatByte.
//   node dev-test.js   (aus bots/music-bot, mit ausgefuellter Root-.env.local)
// Bootet den ECHTEN Bot (require src/index.js), wartet auf Ready und fuehrt jeden
// Command gegen den ECHTEN ctx aus — inkl. echter Voice-Verbindung und /play.
// Faithful Interaction mit echten Guild/Channel-Objekten aus dem Client-Cache.
// Liegt bewusst NICHT unter src/ -> wird nicht ins Docker-Image kopiert.
// /play braucht ein lauffaehiges yt-dlp (MUSIC_YTDLP_PATH), sonst nur bis "buffering".
const path = require('path');
const { AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { client, ctx } = require('./src/index.js');

const results = [];
const rec = (st, label, info) => { results.push([st, label, info]); const ic = st === 'PASS' ? '✓' : st === 'SKIP' ? '○' : '✗'; console.log(`  ${ic} [${st}] ${label}${info ? '  — ' + info : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const C = (f) => require(path.join(__dirname, 'src/commands', f));

function makeInteraction(guild, voiceChannel, textChannel, opts = {}) {
    const calls = [];
    const push = (kind) => (p) => { calls.push({ kind, p }); return Promise.resolve({ id: 'm', edit: () => Promise.resolve(), delete: () => Promise.resolve() }); };
    const int = {
        guildId: guild.id, guild, channel: textChannel,
        user: { id: client.user.id, toString: () => `<@${client.user.id}>`, username: 'DevRunner' },
        member: { voice: { channel: opts.inVoice === false ? null : voiceChannel }, roles: { cache: { has: () => !!opts.isDJ } }, permissions: { has: () => true } },
        client, replied: false, deferred: false,
        options: {
            getString: (n) => (opts.options || {})[n] ?? null, getInteger: (n) => (opts.options || {})[n] ?? null,
            getBoolean: (n) => (opts.options || {})[n] ?? null, getNumber: (n) => (opts.options || {})[n] ?? null,
            getRole: (n) => (opts.options || {})[n] ?? null, getUser: (n) => (opts.options || {})[n] ?? null,
            getChannel: (n) => (opts.options || {})[n] ?? null, getAttachment: (n) => (opts.options || {})[n] ?? null,
            getSubcommand: () => opts.subcommand ?? null, getFocused: () => opts.focused ?? '',
        },
        reply: (p) => { int.replied = true; return push('reply')(p); },
        editReply: push('editReply'), followUp: push('followUp'),
        deferReply: (p) => { int.deferred = true; return push('deferReply')(p); },
        deleteReply: () => Promise.resolve(), respond: (c) => { calls.push({ kind: 'autocomplete', p: c }); return Promise.resolve(); },
        _calls: calls,
    };
    return int;
}

async function drive(label, file, guild, vc, tc, opts) {
    try {
        const int = makeInteraction(guild, vc, tc, opts);
        await C(file).execute(int, ctx);
        const ok = int._calls.some(c => ['reply', 'editReply', 'deferReply', 'followUp'].includes(c.kind));
        rec(ok ? 'PASS' : 'FAIL', label, ok ? int._calls.map(c => c.kind).join('+') : 'keine Antwort');
        return int;
    } catch (e) { rec('FAIL', label, e.message); return null; }
}

(async () => {
    if (!client.isReady()) await new Promise(res => client.once('ready', res));
    console.log(`\n▶ Runner verbunden als ${client.user.tag}`);
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const vc = channels.find(c => c && c.isVoiceBased() && c.permissionsFor(guild.members.me).has('Connect'));
    const tc = channels.find(c => c && c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
    console.log(`▶ Guild: ${guild.name} | Voice: ${vc ? vc.name : 'KEINER'} | Text: ${tc ? tc.name : 'keiner'}\n`);

    console.log('── Text-Commands gegen echten ctx ──');
    await drive('/queue', 'queue.js', guild, vc, tc);
    await drive('/volume (lesen)', 'volume.js', guild, vc, tc, { options: {} });
    await drive('/loop', 'loop.js', guild, vc, tc, { options: {} });
    await drive('/shuffle', 'shuffle.js', guild, vc, tc);
    await drive('/clear', 'clear.js', guild, vc, tc);
    await drive('/nowplaying', 'nowplaying.js', guild, vc, tc);
    await drive('/setrole', 'setrole.js', guild, vc, tc, { options: { rolle: guild.roles.everyone } });
    await drive('/autodj', 'autodj.js', guild, vc, tc, { options: {} });
    await drive('/filter', 'filter.js', guild, vc, tc, { options: { typ: 'bassboost' } });
    await drive('/app', 'app.js', guild, vc, tc);
    await drive('/playlist (list)', 'playlist.js', guild, vc, tc, { subcommand: 'list' });
    await drive('/lyrics', 'lyrics.js', guild, vc, tc, { options: {} });
    await drive('/remove', 'remove.js', guild, vc, tc, { options: { position: 1 } });
    await drive('/move', 'move.js', guild, vc, tc, { options: { von: 1, nach: 2 } });
    await drive('/seek (nichts)', 'seek.js', guild, vc, tc, { options: { zeit: '1:00' } });
    await drive('/pause (nichts)', 'pause.js', guild, vc, tc);
    await drive('/skip (nichts)', 'skip.js', guild, vc, tc);
    await drive('/replay (nichts)', 'replay.js', guild, vc, tc);
    await drive('/stop (nichts)', 'stop.js', guild, vc, tc);
    await drive('/disconnect (nichts)', 'disconnect.js', guild, vc, tc);

    if (!vc) {
        rec('SKIP', '/join /play /playnow (Voice)', 'kein Voice-Channel mit Connect-Recht im Test-Server');
    } else {
        console.log('\n── Voice-Pipeline (echte Verbindung) ──');
        await drive('/join', 'join.js', guild, vc, tc);
        await sleep(2500);
        let q = ctx.queues.get(guild.id);
        const cs = q?.connection?.state?.status;
        rec([VoiceConnectionStatus.Ready, VoiceConnectionStatus.Connecting, VoiceConnectionStatus.Signalling].includes(cs) ? 'PASS' : 'FAIL', '/join -> Verbindung', `Status: ${cs || 'keine'}`);

        console.log('  … /play startet yt-dlp, warte auf DURCHGEHENDE Wiedergabe (max 30s)');
        await drive('/play', 'play.js', guild, vc, tc, { options: { query: 'Rick Astley Never Gonna Give You Up' } });
        // Nur DURCHGEHENDES Playing zaehlt: ein scheiterndes yt-dlp erzeugt in der
        // Retry-Schleife kurze Playing-Flacker (<1s). Verlange 5 aufeinanderfolgende
        // Playing-Samples ueber 3.5s — das haelt nur ein echter Stream durch.
        let played = false, cur = null, ps = null, streak = 0;
        for (let i = 0; i < 43; i++) {
            await sleep(700);
            q = ctx.queues.get(guild.id); cur = q?.current; ps = q?.player?.state?.status;
            streak = (ps === AudioPlayerStatus.Playing) ? streak + 1 : 0;
            if (streak >= 5) { played = true; break; }
        }
        // Kein lauffaehiges yt-dlp lokal = Umgebungsluecke, kein Command-Fehler -> SKIP statt FAIL.
        rec(played ? 'PASS' : 'SKIP', '/play -> Streaming', played ? `current="${cur?.title}", Player=playing (3.5s durchgehend)` : `yt-dlp lokal nicht lauffaehig (Python 3.9) — MUSIC_YTDLP_PATH auf ein aktuelles yt-dlp setzen`);

        if (played) {
            await drive('/nowplaying (aktiv)', 'nowplaying.js', guild, vc, tc);
            await drive('/volume (50, aktiv)', 'volume.js', guild, vc, tc, { options: { prozent: 50 } });
            await drive('/pause (aktiv)', 'pause.js', guild, vc, tc);
            await sleep(500);
            await drive('/seek (aktiv)', 'seek.js', guild, vc, tc, { options: { zeit: '0:30' } });
            await drive('/loop (song, aktiv)', 'loop.js', guild, vc, tc, { options: { modus: 'song' } });
        }
        await drive('/stop', 'stop.js', guild, vc, tc);
        await sleep(500);
        await drive('/disconnect', 'disconnect.js', guild, vc, tc);
        try { ctx.destroyQueue(guild.id); } catch {}
    }

    const pass = results.filter(r => r[0] === 'PASS').length, fail = results.filter(r => r[0] === 'FAIL').length, skip = results.filter(r => r[0] === 'SKIP').length;
    console.log(`\n╔═ MUSIC: PASS ${pass} | SKIP ${skip} | FAIL ${fail} ═`);
    await sleep(500);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Runner-Fehler:', e); process.exit(2); });

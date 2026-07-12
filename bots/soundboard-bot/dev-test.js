// Lokaler Dev-Test-Runner fuer EarTastic.
//   node dev-test.js   (aus bots/soundboard-bot, mit ausgefuellter Root-.env.local)
// Bootet den ECHTEN Bot, legt einen selbst erzeugten Test-Sound (0.5s Stille-WAV)
// in den echten Dev-DB und fuehrt jeden Command gegen echte db + echten Voice-Channel
// aus — inkl. echter /sound-Wiedergabe (ffmpeg-static -> Opus -> Voice).
// Liegt bewusst NICHT unter src/ -> wird nicht ins Docker-Image kopiert.
const path = require('path');
const { client } = require('./src/index.js');
const db = require('./src/database');

// Minimale gueltige WAV (8kHz mono 16-bit, 0.5s Stille) — kein externes File noetig.
function makeTestWav() {
    const sampleRate = 8000, seconds = 0.5, n = Math.floor(sampleRate * seconds);
    const dataLen = n * 2, buf = Buffer.alloc(44 + dataLen);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(dataLen, 40); // Rest bleibt 0 = Stille
    return new Uint8Array(buf);
}

const results = [];
const rec = (st, label, info) => { results.push([st, label, info]); const ic = st === 'PASS' ? '✓' : st === 'SKIP' ? '○' : '✗'; console.log(`  ${ic} [${st}] ${label}${info ? '  — ' + info : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const C = (f) => require(path.join(__dirname, 'src/commands', f));

function makeInteraction(guild, voiceChannel, tc, opts = {}) {
    const calls = [];
    const push = (kind) => (p) => { calls.push({ kind, p }); return Promise.resolve({ id: 'm' }); };
    const int = {
        guildId: guild.id, guild, channel: tc,
        user: { id: client.user.id, toString: () => `<@${client.user.id}>`, username: 'DevRunner' },
        member: { voice: { channel: opts.inVoice === false ? null : voiceChannel } },
        client, replied: false, deferred: false,
        options: { getString: (n) => (opts.options || {})[n] ?? null, getInteger: (n) => (opts.options || {})[n] ?? null, getFocused: () => opts.focused ?? '' },
        reply: (p) => { int.replied = true; return push('reply')(p); },
        editReply: push('editReply'), followUp: push('followUp'),
        deferReply: (p) => { int.deferred = true; return push('deferReply')(p); },
        deleteReply: () => Promise.resolve(), respond: (c) => { calls.push({ kind: 'autocomplete', p: c }); return Promise.resolve(); },
        _calls: calls,
    };
    return int;
}
const contentOf = (int) => int._calls.map(c => (typeof c.p === 'string' ? c.p : c.p?.content) || '').join(' | ');

async function drive(label, file, guild, vc, tc, opts, method = 'execute') {
    try {
        const int = makeInteraction(guild, vc, tc, opts);
        await C(file)[method](int);
        rec(int._calls.length ? 'PASS' : 'FAIL', label, int._calls.length ? int._calls.map(c => c.kind).join('+') : 'keine Antwort');
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
    console.log(`▶ Guild: ${guild.name} | Voice: ${vc ? vc.name : 'KEINER'}\n`);

    let soundId = null;
    try {
        const data = makeTestWav();
        soundId = db.addSound({ name: 'DevTestBeep', filename: 'devtestbeep.wav', category: 'Soundeffekte', isPredefined: 1, data });
        rec(soundId ? 'PASS' : 'FAIL', 'Setup: Test-Sound in DB', soundId ? `id=${soundId}` : 'keine id');
    } catch (e) { rec('FAIL', 'Setup: Test-Sound in DB', e.message); }

    console.log('\n── Commands gegen echte db ──');
    await drive('/soundboard (Panel)', 'soundboard.js', guild, vc, tc);
    await drive('/dashboard (Link)', 'dashboard.js', guild, vc, tc);
    await drive('/volume (75%)', 'volume.js', guild, vc, tc, { options: { prozent: 75 } });
    await drive('/favorite (add)', 'favorite.js', guild, vc, tc, { options: { name: 'DevTestBeep' } });
    await drive('/favorite (remove)', 'favorite.js', guild, vc, tc, { options: { name: 'DevTestBeep' } });
    await drive('/favorite (unbekannt)', 'favorite.js', guild, vc, tc, { options: { name: 'GibtsNicht' } });
    await drive('/sound (unbekannt)', 'sound.js', guild, vc, tc, { options: { name: 'GibtsNicht' } });
    await drive('/sound (nicht im Voice)', 'sound.js', guild, vc, tc, { options: { name: 'DevTestBeep' }, inVoice: false });
    await drive('/sound autocomplete', 'sound.js', guild, vc, tc, { focused: 'Dev' }, 'autocomplete');
    await drive('/favorite autocomplete', 'favorite.js', guild, vc, tc, { focused: 'Dev' }, 'autocomplete');

    if (!vc) {
        rec('SKIP', '/sound (echte Wiedergabe)', 'kein Voice-Channel mit Connect-Recht');
    } else {
        console.log('\n── Echte Voice-Wiedergabe ──');
        const int = await drive('/sound (IM Voice)', 'sound.js', guild, vc, tc, { options: { name: 'DevTestBeep' } });
        const txt = int ? contentOf(int) : '';
        const spielt = /Spiele/.test(txt) && !/Fehler/.test(txt);
        rec(spielt ? 'PASS' : 'FAIL', '/sound -> Wiedergabe abgeschlossen', spielt ? 'ffmpeg-static -> Opus -> Voice' : `Antwort: ${txt}`);
    }

    try { if (soundId) db.deleteSound(soundId); } catch {}
    const pass = results.filter(r => r[0] === 'PASS').length, fail = results.filter(r => r[0] === 'FAIL').length, skip = results.filter(r => r[0] === 'SKIP').length;
    console.log(`\n╔═ SOUNDBOARD: PASS ${pass} | SKIP ${skip} | FAIL ${fail} ═`);
    await sleep(500);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Runner-Fehler:', e); process.exit(2); });

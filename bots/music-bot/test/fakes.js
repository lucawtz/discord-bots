// Test-Doubles fuer BeatByte: Discord-Objekte und Kindprozesse.
// Absicht: Der Bot laeuft im Test mit seinem ECHTEN ctx (src/index.js unter
// BEATBYTE_TEST=1). Gefaelscht wird nur, was nach draussen geht — Discord und
// yt-dlp. FFmpeg bleibt echt, damit die Audio-Pipeline wirklich durchlaeuft.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { Readable } = require('stream');

// ── Protokoll ─────────────────────────────────────────────────────
// Jede Nachrichten-Operation landet hier. Die Reihenfolge IST die Zusicherung:
// genau daran haengt, ob sich /play "clean" anfuehlt oder nicht.
function createLog() {
    const entries = [];
    return {
        entries,
        push: (op, detail) => entries.push({ op, detail, at: Date.now() }),
        ops: () => entries.map(e => e.op),
        find: (op) => entries.filter(e => e.op === op),
        dump: () => entries.map((e, i) => `${i + 1}. ${e.op}${e.detail ? `: ${e.detail}` : ''}`).join('\n'),
    };
}

// Kurzfassung eines Nachrichten-Payloads fuers Protokoll.
function describe(payload) {
    if (typeof payload === 'string') return payload.slice(0, 80);
    if (payload?.content) return payload.content.slice(0, 80);
    const embed = payload?.embeds?.[0];
    const data = embed?.data || embed;
    const head = (data?.description || '').split('\n').filter(Boolean)[0] || '';
    const author = data?.author?.name || '';
    const btns = payload.components?.length
        ? ` [buttons ${payload.components[0].components?.[0]?.data?.disabled ? 'aus' : 'an'}]`
        : '';
    return `${author} | ${head}${btns}`;
}

// ── Fake-Nachricht (Rueckgabe von channel.send / editReply) ───────
function fakeMessage(log, id = 'msg') {
    return {
        id,
        edit: async (p) => { log.push('message.edit', describe(p)); return fakeMessage(log, id); },
        delete: async () => { log.push('message.delete', id); },
    };
}

// ── Fake-Textkanal ────────────────────────────────────────────────
function fakeChannel(log) {
    let n = 0;
    return {
        id: 'text-1',
        isTextBased: () => true,
        send: async (p) => { log.push('channel.send', describe(p)); return fakeMessage(log, `ch-${++n}`); },
    };
}

// ── Fake-Interaction fuer Slash-Commands ──────────────────────────
function fakeInteraction(log, { query = '', inVoice = true, locale = 'de' } = {}) {
    let n = 0;
    const user = { id: '1001', toString: () => '<@1001>', username: 'Tester' };
    return {
        guildId: 'guild-1',
        guild: { id: 'guild-1' },
        channel: fakeChannel(log),
        locale, guildLocale: locale,
        user,
        member: { voice: { channel: inVoice ? { id: 'voice-1' } : null } },
        client: { user: { displayAvatarURL: () => 'https://example/icon.png' } },
        options: { getString: () => query, getFocused: () => query },
        deferReply: async () => { log.push('deferReply'); },
        reply: async (p) => { log.push(p.ephemeral ? 'reply.ephemeral' : 'reply', describe(p)); },
        editReply: async (p) => { log.push('editReply', describe(p)); return fakeMessage(log, `reply-${++n}`); },
        deleteReply: async () => { log.push('deleteReply'); },
        respond: async (choices) => { log.push('autocomplete', choices.map(c => c.name).join(' | ')); },
    };
}

// ── Fake yt-dlp ───────────────────────────────────────────────────
// Verhaelt sich wie ein ChildProcess: stdout/stderr als Streams, close-Event.
// Je nach Aufruf liefert es JSON (Suche) oder Audio-Bytes (Streaming).
// Test-Audio: 3 Sekunden Sinuston als Ogg/Opus. Wird beim ersten Lauf erzeugt
// statt als Binaerdatei im Repo zu liegen — FFmpeg ist ohnehin Voraussetzung,
// sonst koennte der Bot gar nicht streamen.
const TONE = path.join(__dirname, 'fixtures', 'tone.ogg');
function ensureTone() {
    if (fs.existsSync(TONE)) return TONE;
    fs.mkdirSync(path.dirname(TONE), { recursive: true });
    let ffmpeg = 'ffmpeg';
    try { require('child_process').execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' }); }
    catch { ffmpeg = require('@ffmpeg-installer/ffmpeg').path; }
    require('child_process').execFileSync(ffmpeg, [
        '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
        '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '2', '-f', 'ogg', '-y', TONE,
    ]);
    return TONE;
}

function fakeProcess({ stdout = null, stderr = '', code = 0, delayMs = 0 }) {
    const proc = new EventEmitter();
    proc.killed = false;
    proc.kill = () => { proc.killed = true; proc.stdout.destroy(); setImmediate(() => proc.emit('close', null)); };
    proc.stdout = stdout || Readable.from([]);
    proc.stderr = Readable.from(stderr ? [stderr] : []);
    proc.stdin = null;
    const finish = () => {
        if (proc.killed) return;
        if (stdout) proc.stdout.once('end', () => proc.emit('close', code));
        else proc.emit('close', code);
    };
    if (delayMs) setTimeout(finish, delayMs); else setImmediate(finish);
    return proc;
}

// searchJson: Antwort auf --dump-single-json. audioDelayMs: simuliert die
// Extraktionszeit (POT-Token, Player-JS), bevor das erste Byte kommt.
function makeFakeSpawn(log, { searchJson = null, audioDelayMs = 0, failSearch = false } = {}) {
    const realSpawn = require('child_process').spawn;
    return (bin, args = []) => {
        // FFmpeg bleibt echt — sonst testet man die Audio-Pipeline nicht, sondern
        // nur den Fake. Gefaelscht wird ausschliesslich yt-dlp.
        if (/ffmpeg/i.test(bin)) return realSpawn(bin, args);

        const isSearch = args.includes('--dump-single-json');
        if (isSearch) {
            const target = args[args.length - 1];
            log.push('yt-dlp.search', target);
            if (failSearch) return fakeProcess({ stderr: 'ERROR: no results', code: 1 });
            return fakeProcess({ stdout: Readable.from([JSON.stringify(searchJson || DEFAULT_SEARCH)]), code: 0 });
        }
        if (args.includes('-o') && args[args.indexOf('-o') + 1] === '-') {
            log.push('yt-dlp.stream', args[args.length - 1]);
            // Extraktionspause, dann echte Audio-Bytes in die FFmpeg-Pipe
            const src = fs.createReadStream(ensureTone());
            const gated = new Readable({ read() {} });
            setTimeout(() => {
                src.on('data', c => gated.push(c));
                src.on('end', () => gated.push(null));
            }, audioDelayMs);
            return fakeProcess({ stdout: gated, code: 0 });
        }
        log.push('yt-dlp.other', args.join(' ').slice(0, 40));
        return fakeProcess({ code: 0 });
    };
}

const DEFAULT_SEARCH = {
    entries: [{
        id: 'test1', title: 'G Wagon', webpage_url: 'https://www.youtube.com/watch?v=test1',
        duration: 152, channel: 'Gzuz', uploader: 'Gzuz', thumbnail: 'https://example/t.jpg',
    }],
};

module.exports = { createLog, fakeInteraction, fakeChannel, fakeMessage, makeFakeSpawn, fakeProcess, describe, ensureTone, TONE };

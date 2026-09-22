// DER BEWEIS-LAUF. Beantwortet die drei Fragen, die offline nicht zu klaeren sind:
//
//   1. Spielt Lavalink ueberhaupt Ton in einen Discord-Voice-Channel?
//   2. Spielt LIZENZIERTE Musik — das Problem, das im September zum Pi-Tunnel
//      gefuehrt hat ("Video unavailable" auf WARP-Exit-IPs)?
//   3. Laufen Seek, Filter und Lautstaerke wirklich LIVE, also ohne den Track
//      neu zu laden? Genau das kann die heutige FFmpeg-Pipe nicht.
//
// Start:
//   1) Lavalink lokal starten:  node test/lavalink-local.js
//   2) In der Root-.env.local:  MUSIC_DISCORD_TOKEN, MUSIC_GUILD_ID
//   3) node test/lavalink-live.js  [--query "Interpret Titel"]
//
// Der Bot muss im Test-Server in einem Voice-Channel "Verbinden" duerfen.
// Zum Mithoeren: selbst in den Channel gehen, bevor es losgeht.
const path = require('path');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));

const { Client, GatewayIntentBits, Events } = require('discord.js');
const { LavalinkNode, buildFilters } = require('../src/audio/lavalink');
const { fetchVisitorData, mintPoToken, pingProvider } = require('../src/audio/potoken');

const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
};

// Abdeckungsprobe: eine Mischung aus offiziell/Evergreen und lizenzierter
// Major-Label-Ware. Ohne poToken oder OAuth spielt YouTube nur einen Teil davon
// — genau diese Quote ist die Entscheidungsgrundlage.
const SINGLE = arg('query', null);
const COVERAGE = SINGLE ? [SINGLE] : [
    'Rick Astley Never Gonna Give You Up',
    'Queen Bohemian Rhapsody official',
    'Gzuz G Wagon',
    'lofi hip hop radio beats',
];
const LL_HOST = arg('lavalink-host', '127.0.0.1');
const LL_PORT = Number(arg('lavalink-port', 2333));
const LL_PASS = process.env.LAVALINK_PASSWORD || 'probe';
// Ohne poToken spielt YouTube nur einen Teil des Katalogs — der Provider ist
// derselbe, den die yt-dlp-Pipeline in Prod schon nutzt (Port 4416).
const POT_PROVIDER = arg('pot-provider', process.env.POT_PROVIDER_URL || null);
const POT_PROXY = arg('pot-proxy', null);

const results = [];
const rec = (status, label, info) => {
    results.push({ status, label, info });
    const icon = status === 'PASS' ? '✓' : status === 'SKIP' ? '○' : '✗';
    console.log(`  ${icon} [${status}] ${label}${info ? '  — ' + info : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Alle Voraussetzungen auf einmal pruefen, statt den Benutzer einen Fehler nach
// dem anderen abarbeiten zu lassen.
async function preflight() {
    const missing = [];
    const envFile = path.join(__dirname, '..', '..', '..', '.env.local');
    const hasEnvFile = require('fs').existsSync(envFile);

    for (const name of ['DISCORD_TOKEN', 'GUILD_ID']) {
        const value = process.env[name];
        if (!value) missing.push(`MUSIC_${name} fehlt`);
        else if (/^HIER-EINTRAGEN/i.test(value)) missing.push(`MUSIC_${name} steht noch auf dem Platzhalter`);
    }

    let lavalinkOk = false, lavalinkInfo = '';
    try {
        const res = await fetch(`http://${LL_HOST}:${LL_PORT}/version`, { headers: { Authorization: LL_PASS } });
        if (!res.ok) throw new Error(res.status === 401 ? 'Passwort passt nicht' : `HTTP ${res.status}`);
        lavalinkOk = true;
        lavalinkInfo = (await res.text()).trim();
    } catch (e) {
        missing.push(`Lavalink auf ${LL_HOST}:${LL_PORT} nicht erreichbar (${e.message})`);
    }

    if (missing.length) {
        console.error('\n✗ Es fehlt noch etwas:\n');
        for (const m of missing) console.error(`    • ${m}`);
        if (!hasEnvFile) {
            console.error(`\n  Es gibt noch keine ${envFile}.`);
            console.error('  Anlegen mit den zwei Zeilen, die dieser Lauf braucht:\n');
            console.error('    MUSIC_DISCORD_TOKEN=<Token des DEV-Bots>');
            console.error('    MUSIC_GUILD_ID=<ID des Test-Servers>');
            console.error('\n  Token: Discord Developer Portal → deine Application → Bot → Reset Token.');
            console.error('  Server-ID: In Discord Entwicklermodus an, Rechtsklick auf den Server → ID kopieren.');
        }
        if (!lavalinkOk) {
            console.error('\n  Lavalink laeuft nicht. In einem ZWEITEN Terminal starten und offen lassen:');
            console.error('    pnpm --filter discord-music-bot lavalink');
        }
        console.error('');
        process.exit(2);
    }
    return lavalinkInfo;
}

// Wartet, bis die Position echt vorankommt — das ist der Nachweis, dass Ton
// fliesst. Ein verbundener Player mit stehender Position spielt nichts.
async function waitForProgress(node, guildId, { minAdvanceMs = 800, timeoutMs = 20_000 } = {}) {
    const start = Date.now();
    const first = node.players.get(guildId)?.position ?? 0;
    while (Date.now() - start < timeoutMs) {
        await sleep(400);
        const now = node.players.get(guildId)?.position ?? 0;
        if (now - first >= minAdvanceMs) return { advancedMs: now - first, tookMs: Date.now() - start };
    }
    return null;
}

(async () => {
    const version = await preflight();
    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.GUILD_ID;

    console.log('\n▶ Lavalink-Beweislauf\n');
    rec('PASS', 'Lavalink erreichbar', version);

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
    await client.login(token);
    await new Promise(r => client.once(Events.ClientReady, r));
    console.log(`▶ Bot: ${client.user.tag}`);

    const node = new LavalinkNode({
        host: LL_HOST, port: LL_PORT, password: LL_PASS, userId: client.user.id,
        sendGateway: (gid, payload) => client.guilds.cache.get(gid)?.shard.send(payload),
    });

    // Die zwei Gateway-Haelften an Lavalink durchreichen. Ohne das baut es nie
    // eine Voice-Verbindung auf — der haeufigste Anfaengerfehler.
    client.on(Events.Raw, (packet) => {
        if (packet.t === 'VOICE_STATE_UPDATE') node.handleVoiceState(packet.d);
        if (packet.t === 'VOICE_SERVER_UPDATE') node.handleVoiceServer(packet.d);
    });

    node.on('error', e => console.error('  [lavalink]', e.message));
    const events = [];
    node.on('trackEvent', e => events.push(e));

    await new Promise((resolve, reject) => {
        node.once('ready', resolve);
        node.once('error', reject);
        node.connect();
        setTimeout(() => reject(new Error('kein ready binnen 15s')), 15_000);
    }).then(
        () => rec('PASS', 'Lavalink-Session', node.sessionId),
        (e) => { rec('FAIL', 'Lavalink-Session', e.message); process.exit(1); },
    );

    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const vc = channels.find(c => c?.isVoiceBased() && c.permissionsFor(guild.members.me).has('Connect'));
    if (!vc) { rec('FAIL', 'Voice-Channel', 'keiner mit Connect-Recht gefunden'); return finish(client, node, guildId); }
    console.log(`▶ Server: ${guild.name} | Channel: ${vc.name}\n`);

    // ── 1. Voice ──────────────────────────────────────────────────
    console.log('── Frage 1: Kommt ueberhaupt Ton in den Channel? ──');
    let t0 = Date.now();
    node.joinVoice(guildId, vc.id);
    await sleep(2500); // Gateway-Roundtrip fuer beide Voice-Haelften
    const connected = node.players.get(guildId)?.connectedToVoice;
    rec(connected ? 'PASS' : 'FAIL', 'Voice-Verbindung', connected ? `${Date.now() - t0}ms` : 'Lavalink meldet connected=false');
    if (!connected) return finish(client, node, guildId);

    // ── 1b. poToken ───────────────────────────────────────────────
    // Ohne den spielt YouTube nur einen Teil des Katalogs. Der Token wird beim
    // bgutil-Provider geholt (derselbe Dienst, den die yt-dlp-Pipeline nutzt)
    // und per POST /youtube an das Plugin uebergeben.
    if (POT_PROVIDER) {
        try {
            const pong = await pingProvider(POT_PROVIDER);
            const visitorData = await fetchVisitorData();
            const minted = await mintPoToken(POT_PROVIDER, visitorData, { proxy: POT_PROXY });
            await node.setYoutubeConfig({ poToken: minted.poToken, visitorData: minted.visitorData });
            rec('PASS', 'poToken gesetzt',
                `Provider v${pong.version} — ${minted.poToken.length} Zeichen, gueltig bis `
                + `${minted.expiresAt ? minted.expiresAt.toISOString() : 'unbekannt'}`);
        } catch (e) {
            rec('FAIL', 'poToken', e.message);
        }
    } else {
        rec('SKIP', 'poToken', 'ohne --pot-provider <url> — Abdeckung wird entsprechend niedrig sein');
    }

    // ── 2. YouTube-Abdeckung ──────────────────────────────────────
    // Getrennt bewertet: dass Lavalink funktioniert und dass YouTube liefert,
    // sind zwei verschiedene Fragen. Ohne poToken/OAuth spielt nur ein Teil.
    console.log('\n── Frage 2: Wie viel von YouTube spielt wirklich? ──');
    let track = null;
    let playable = 0;
    for (const query of COVERAGE) {
        const loaded = await node.loadTracks(`ytsearch:${query}`);
        if (!loaded.tracks.length) { rec('FAIL', query, loaded.error || `loadType=${loaded.loadType}`); continue; }
        const candidate = loaded.tracks[0];

        const before = node.players.get(guildId)?.position ?? 0;
        let exception = null;
        await node.play(guildId, candidate.encoded).catch(e => { exception = e.message; });
        const started = await waitForProgress(node, guildId, { minAdvanceMs: 800, timeoutMs: 12_000 });
        const pos = node.players.get(guildId)?.position ?? 0;
        const ok = !!started || pos > before + 800;

        if (ok) {
            playable++;
            if (!track) track = candidate;  // der erste spielbare traegt die Steuertests
            rec('PASS', query, `"${candidate.info.title}" — ${candidate.info.author}`);
        } else {
            const exc = events.filter(e => e.type === 'TrackExceptionEvent').pop();
            const why = exception || exc?.exception?.message?.split('\n')[0] || 'Position blieb stehen';
            rec('FAIL', query, `"${candidate.info.title}" — ${why.slice(0, 90)}`);
        }
        await node.stop(guildId).catch(() => {});
        await sleep(400);
    }
    console.log(`\n  Abdeckung: ${playable} von ${COVERAGE.length} spielbar`);

    if (!track) {
        rec('FAIL', 'WIEDERGABE', 'kein einziger Track spielbar — Steuertests uebersprungen');
        return finish(client, node, guildId);
    }

    // Den ersten spielbaren Track fuer die Steuertests wieder starten
    await node.play(guildId, track.encoded);
    const started = await waitForProgress(node, guildId, { minAdvanceMs: 1000, timeoutMs: 20_000 });
    rec(started ? 'PASS' : 'FAIL', 'WIEDERGABE — Ton fliesst',
        started ? `erste Bewegung nach ${started.tookMs}ms` : 'Position kam nicht voran');
    if (!started) return finish(client, node, guildId);

    // ── 3. Live-Steuerung ─────────────────────────────────────────
    console.log('\n── Frage 3: Seek/Filter/Lautstaerke ohne Neu-Laden? ──');
    const endsBefore = events.filter(e => e.type === 'TrackEndEvent').length;

    t0 = Date.now();
    await node.seek(guildId, 60_000);
    const afterSeek = await waitForProgress(node, guildId, { minAdvanceMs: 500, timeoutMs: 15_000 });
    const pos = node.players.get(guildId)?.position ?? 0;
    rec(afterSeek && pos >= 59_000 ? 'PASS' : 'FAIL', 'Seek auf 1:00',
        afterSeek ? `wieder unterwegs nach ${afterSeek.tookMs}ms, Position ${Math.round(pos / 1000)}s` : 'blieb stehen');

    t0 = Date.now();
    await node.setFilters(guildId, buildFilters({ filter: 'bassboost' }));
    const afterFilter = await waitForProgress(node, guildId, { minAdvanceMs: 500, timeoutMs: 10_000 });
    rec(afterFilter ? 'PASS' : 'FAIL', 'Bassboost im Lauf', afterFilter ? `durchgehend, ${Date.now() - t0}ms` : 'Wiedergabe stand');

    t0 = Date.now();
    await node.setVolume(guildId, 40);
    const afterVol = await waitForProgress(node, guildId, { minAdvanceMs: 500, timeoutMs: 10_000 });
    rec(afterVol ? 'PASS' : 'FAIL', 'Lautstaerke im Lauf', afterVol ? `durchgehend, ${Date.now() - t0}ms` : 'Wiedergabe stand');

    const endsAfter = events.filter(e => e.type === 'TrackEndEvent').length;
    rec(endsAfter === endsBefore ? 'PASS' : 'FAIL', 'kein Track-Neustart',
        endsAfter === endsBefore ? 'kein TrackEndEvent waehrend Seek/Filter/Volume' : `${endsAfter - endsBefore} Neustart(s) — das waere der alte Zustand`);

    console.log('\n  … 5 s Hoerprobe (Bassboost, Lautstaerke 40) …');
    await sleep(5000);

    await finish(client, node, guildId);
})().catch(e => {
    if (e?.code === 'TokenInvalid') {
        console.error('\n✗ Discord hat das Token abgelehnt.\n' +
            '  MUSIC_DISCORD_TOKEN in der Root-.env.local pruefen — es muss das Token des\n' +
            '  DEV-Bots sein (Developer Portal → Bot → Reset Token), nicht die Client-ID\n' +
            '  und nicht das Prod-Token.\n');
        process.exit(2);
    }
    console.error('\nRunner-Fehler:', e);
    process.exit(2);
});

async function finish(client, node, guildId) {
    try { await node.destroyPlayer(guildId); node.leaveVoice(guildId); } catch {}
    await sleep(600);
    node.destroy();
    // Zwei getrennte Urteile. Dass Lavalink funktioniert und dass YouTube
    // liefert, sind verschiedene Fragen — ein Sourcing-Problem ist KEIN
    // Lavalink-Problem. Die heutige yt-dlp-Pipeline loest es nur anders
    // (bgutil-POT-Provider), und dasselbe ist hier noetig.
    const isCoverage = (r) => COVERAGE.includes(r.label);
    const coreFail = results.filter(r => r.status === 'FAIL' && !isCoverage(r)).length;
    const covOk = results.filter(r => r.status === 'PASS' && isCoverage(r)).length;
    const covAll = results.filter(isCoverage).length;

    console.log(`\n╔═ Lavalink selbst: ${coreFail === 0 ? 'FUNKTIONIERT' : `FEHLER (${coreFail})`}`);
    if (covAll) console.log(`║  YouTube-Abdeckung: ${covOk}/${covAll} spielbar`);
    console.log('║');
    if (coreFail > 0) {
        console.log('║  Nicht gruen. Kein Umbau, bevor das geklaert ist.');
    } else if (covAll && covOk < covAll) {
        console.log('║  Lavalink ist nicht das Problem — YouTube verlangt einen');
        console.log('║  poToken oder OAuth. Ohne das spielt nur ein Teil des Katalogs.');
        console.log('║  Erst das loesen, dann umbauen.');
    } else {
        console.log('║  Gruenes Licht — der Umbau kann beginnen.');
    }
    console.log('╚' + '═'.repeat(48));
    await client.destroy();
    // Exit 0 nur, wenn BEIDES steht.
    process.exit(coreFail === 0 && covOk === covAll ? 0 : 1);
}

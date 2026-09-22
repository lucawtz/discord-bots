// Startet Lavalink lokal fuer den Beweislauf — laedt das Jar beim ersten Mal
// selbst und setzt die JVM-Flags, die im Pruefstand funktioniert haben.
//
//   node test/lavalink-local.js                 # ohne Proxy (lokale IP)
//   node test/lavalink-local.js --socks 1080    # ueber einen SOCKS5-Proxy
//   node test/lavalink-local.js --oauth         # mit YouTube-OAuth (siehe unten)
//
// Laeuft im Vordergrund, Strg+C beendet. In einem zweiten Terminal dann
// `node test/lavalink-live.js`.
//
// ── Warum --oauth ─────────────────────────────────────────────────
// Am 2026-09-22 gemessen: ohne OAuth spielt youtube-source nur 1 von 4 Tracks.
// Die Clients, die noch brauchbare Audio-Formate liefern (TVHTML5 & Co.), sind
// OAuth-Clients und werden ohne Anmeldung gar nicht erst versucht; uebrig
// bleiben WEB (SABR, keine https-Formate), WEB_EMBEDDED_PLAYER und ANDROID_VR
// ("requires login"). Ein poToken hilft dort nicht — er betrifft nur WEB und
// WEBEMBEDDED, also genau die kaputten.
//
// Mit --oauth zeigt dieses Skript den Device-Code gross an. Nach der Anmeldung
// gibt Lavalink einen Refresh-Token aus; der gehoert in die Root-.env.local als
// MUSIC_YOUTUBE_REFRESH_TOKEN, dann entfaellt die Anmeldung kuenftig.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));

const LAVALINK_VERSION = '4.2.2';
const YOUTUBE_PLUGIN_VERSION = '1.18.2';
const DIR = path.join(__dirname, 'fixtures', 'lavalink');
const JAR = path.join(DIR, 'Lavalink.jar');
const PASSWORD = process.env.LAVALINK_PASSWORD || 'probe';

// Ein nachfolgendes --flag ist KEIN Wert. Ohne diese Pruefung wurde aus
// "--cipher --port 2334" die Cipher-URL "--port".
const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    if (i === -1) return fallback;
    const next = process.argv[i + 1];
    return next && !next.startsWith('--') ? next : fallback;
};
const has = (name) => process.argv.includes(`--${name}`);

const socksPort = arg('socks', null);
const socksHost = arg('socks-host', '127.0.0.1');
const port = Number(arg('port', 2333));
const useOauth = has('oauth') || !!process.env.YOUTUBE_REFRESH_TOKEN;
const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN || null;
// Signatur-Entschluesselung auslagern. youtube-source 1.18.2 scheitert am
// aktuellen YouTube-Player ("Must find sig function from script"); Issue #225
// dazu wurde als "not planned" geschlossen — die Maintainer jagen die Regex
// nicht mehr hinterher, sondern verweisen auf einen Cipher-Dienst. Das
// entspricht --remote-components ejs:github bei yt-dlp.
// Die oeffentliche Instanz ist zum TESTEN gedacht; fuer Prod selbst hosten.
const cipherUrl = has('cipher') ? (arg('cipher', null) || 'https://cipher.kikkia.dev') : null;

function download(url, dest, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('zu viele Weiterleitungen'));
        https.get(url, { headers: { 'User-Agent': 'beatbyte-test' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(download(res.headers.location, dest, redirects + 1));
            }
            if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
            const total = Number(res.headers['content-length'] || 0);
            let got = 0, lastPct = -1;
            const file = fs.createWriteStream(dest);
            res.on('data', (c) => {
                got += c.length;
                const pct = total ? Math.floor(got / total * 100) : 0;
                if (pct >= lastPct + 10) { lastPct = pct; process.stdout.write(`\r  ${pct}% (${(got / 1e6).toFixed(0)} MB)`); }
            });
            res.pipe(file);
            file.on('finish', () => file.close(() => { process.stdout.write('\r  fertig      \n'); resolve(dest); }));
        }).on('error', reject);
    });
}

// Reihenfolge = Failover-Reihenfolge. Mit OAuth zuerst die Clients, die noch
// echte Audio-Formate liefern; ohne OAuth haben die keinen Zweck.
const CLIENTS = useOauth
    ? '["TV", "TVHTML5_SIMPLY", "IOS", "MUSIC", "ANDROID_MUSIC", "MWEB", "WEB", "WEBEMBEDDED"]'
    : '["MUSIC", "ANDROID_VR", "WEB", "WEBEMBEDDED"]';

const OAUTH_BLOCK = useOauth
    ? `    oauth:\n      enabled: true\n${refreshToken ? `      refreshToken: "${refreshToken}"\n` : ''}`
    : '';

const CIPHER_BLOCK = cipherUrl
    ? `    remoteCipher:\n      url: "${cipherUrl}"\n`
        + (process.env.YT_CIPHER_PASSWORD ? `      password: "${process.env.YT_CIPHER_PASSWORD}"\n` : '')
        + '      userAgent: "BeatByte-Test"\n'
    : '';

const CONFIG = `server:
  port: ${port}
  address: 127.0.0.1

lavalink:
  plugins:
    - dependency: "dev.lavalink.youtube:youtube-plugin:${YOUTUBE_PLUGIN_VERSION}"
      snapshot: false
  server:
    password: "${PASSWORD}"
    sources:
      youtube: false
      soundcloud: true
      bandcamp: false
      twitch: false
      vimeo: false
      http: true
      local: false
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    opusEncodingQuality: 10
    resamplingQuality: LOW
    trackStuckThresholdMs: 10000
    useSeekGhosting: true
    playerUpdateInterval: 1

plugins:
  youtube:
    enabled: true
    clients: ${CLIENTS}
${OAUTH_BLOCK}${CIPHER_BLOCK}
logging:
  level:
    root: INFO
    lavalink: INFO
    dev.lavalink.youtube: INFO
`;

const box = (lines) => {
    const width = Math.max(...lines.map(l => l.length)) + 2;
    console.log('\n' + '█'.repeat(width + 2));
    for (const l of lines) console.log('█ ' + l.padEnd(width - 1) + '█');
    console.log('█'.repeat(width + 2) + '\n');
};

// Die Zeilen, auf die es ankommt — aus YoutubeOauth2Handler.java.
let waitTicker = null;
function watchLine(line) {
    const device = line.match(/go to (\S+) and enter code (\S+)/);
    if (device) {
        box([
            'YOUTUBE-ANMELDUNG NOETIG — DAS SKRIPT WARTET JETZT AUF DICH',
            '',
            `1. Oeffne:  ${device[1]}`,
            `2. Code:    ${device[2]}`,
            '3. Zugriff erlauben, dann hierher zurueckschauen.',
            '',
            'NUR MIT EINEM WEGWERF-KONTO — das Plugin warnt selbst davor,',
            'dafuer den Haupt-Google-Account zu benutzen.',
            '',
            'Bis du den Code eingibst, passiert hier nichts mehr. Das ist',
            'normal. Der Code laeuft nach ~30 Minuten ab — dann Strg+C und',
            'neu starten fuer einen frischen.',
        ]);
        // Lebenszeichen, damit ein stilles Terminal nicht wie ein Absturz wirkt.
        let waited = 0;
        waitTicker = setInterval(() => {
            waited += 30;
            console.log(`  … warte auf die Anmeldung (${waited}s)`);
        }, 30_000);
        waitTicker.unref?.();
        return;
    }

    const token = line.match(/Store your refresh token as this can be reused\. \((.+?)\)/);
    if (token) {
        clearInterval(waitTicker);
        box([
            'ANMELDUNG ERFOLGREICH',
            '',
            'Diese Zeile in die Root-.env.local eintragen, dann entfaellt',
            'die Anmeldung beim naechsten Start:',
            '',
            `MUSIC_YOUTUBE_REFRESH_TOKEN=${token[1]}`,
        ]);
        try {
            fs.writeFileSync(path.join(DIR, 'refresh-token.txt'), token[1]);
            console.log(`  (auch gespeichert unter ${path.join(DIR, 'refresh-token.txt')})\n`);
        } catch { /* nicht schlimm */ }
        return;
    }

    if (/device token has expired/i.test(line) || /Account linking was denied/i.test(line)) clearInterval(waitTicker);
    if (/device token has expired/i.test(line)) {
        box(['CODE ABGELAUFEN', '', 'Lavalink neu starten und schneller sein.']);
    }
    if (/Account linking was denied/i.test(line)) {
        box(['ANMELDUNG ABGELEHNT', '', 'Im Browser wurde der Zugriff verweigert.']);
    }
}

(async () => {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, 'application.yml'), CONFIG);

    if (!fs.existsSync(JAR)) {
        console.log(`Lade Lavalink ${LAVALINK_VERSION} (~96 MB, einmalig)…`);
        await download(`https://github.com/lavalink-devs/Lavalink/releases/download/${LAVALINK_VERSION}/Lavalink.jar`, JAR);
    }

    const javaArgs = ['-Xmx192m', '-XX:MaxMetaspaceSize=128m'];
    if (socksPort) {
        // Derselbe Weg wie in Prod: youtube-source kennt keine Proxy-Option,
        // also JVM-global. Im Pruefstand nachgewiesen.
        javaArgs.push(`-DsocksProxyHost=${socksHost}`, `-DsocksProxyPort=${socksPort}`);
        console.log(`SOCKS-Proxy: ${socksHost}:${socksPort}`);
    }
    javaArgs.push('-jar', 'Lavalink.jar');

    console.log(`Starte Lavalink auf 127.0.0.1:${port} (Passwort: ${PASSWORD})`);
    console.log(`Clients: ${CLIENTS}`);
    if (cipherUrl) console.log(`Remote-Cipher: ${cipherUrl}`);
    if (useOauth) {
        console.log(refreshToken
            ? 'OAuth: mit gespeichertem Refresh-Token (keine Anmeldung noetig)'
            : 'OAuth: AN — gleich erscheint ein Anmelde-Code, bitte hier mitlesen');
    }
    console.log('Danach in einem zweiten Terminal:  node test/lavalink-live.js\n');

    const proc = spawn('java', javaArgs, { cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    const consume = (chunk) => {
        process.stdout.write(chunk);
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) watchLine(line);
    };
    proc.stdout.on('data', consume);
    proc.stderr.on('data', consume);

    proc.on('error', (e) => {
        console.error(`\nJava konnte nicht gestartet werden: ${e.message}`);
        console.error('Lavalink 4 braucht Java 17 oder neuer.');
        process.exit(2);
    });
    const stop = () => { proc.kill(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
})();

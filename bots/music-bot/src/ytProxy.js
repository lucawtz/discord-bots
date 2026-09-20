// ── YouTube-Proxy mit Ausweich-Kette ─────────────────────────────────
// YouTube laeuft auf einer Rechenzentrums-IP nur mehrfach abgesichert:
//   1) --proxy                 -> saubere IP (seit 2026-09-13 der Heim-Tunnel des
//                                 Raspberry Pi; WARP-IPs sperrt YouTube fuer Musik)
//   2) POT-Token (fetch_pot)   -> "kein Bot"-Nachweis ueber den bgutil-Provider
//   3) --remote-components ejs -> loest die YouTube JS-Signatur / n-challenge
//
// Warum dieses Modul: Faellt der Primaer-Proxy aus (Pi offline, WLAN weg), war
// vorher JEDES YouTube-Ziel tot — auch die generischen Videos, die ueber WARP
// weiterhin gehen. Hier wird der Ausfall erkannt (yt-dlp-Fehlertext ODER
// TCP-Probe), fuer DOWN_MS auf YTDLP_PROXY_FALLBACK umgeschaltet und danach
// automatisch wieder der Primaer-Proxy probiert — ohne Deploy, ohne Handgriff.
// Der Zustandswechsel wird nach aussen gemeldet (Alert-Kanal + #status-Embed).
//
// Der POT-Request an den Provider laeuft NICHT ueber den Proxy (das bgutil-Plugin
// umgeht ihn), daher reicht der interne Service-Name pot-provider:4416.
'use strict';

const net = require('net');

const POT_PROVIDER_URL = process.env.POT_PROVIDER_URL || 'http://pot-provider:4416';
const PRIMARY = process.env.YTDLP_PROXY || 'socks5://warp:1080';
const FALLBACK = process.env.YTDLP_PROXY_FALLBACK || '';
const DOWN_MS = Number(process.env.YTDLP_PROXY_DOWN_MS) || 5 * 60_000;
const CHECK_MS = Number(process.env.YTDLP_PROXY_CHECK_MS) || 60_000;

// Lokaler Opt-out: YTDLP_PROXY=direct laesst yt-dlp ohne Proxy/POT ueber die
// lokale IP laufen (die Service-Namen warp/pot-provider gibt es lokal nicht).
const DIRECT_VALUES = ['direct', 'none', 'off', 'local'];
const isDirect = (proxy) => !proxy || DIRECT_VALUES.includes(String(proxy).toLowerCase());

// So sehen Proxy-Ausfaelle in yt-dlps stderr aus:
//   "Unable to download webpage: <urlopen error [Errno 111] Connection refused>
//    (caused by ProxyError(...))"  bzw. "[Errno 4] Host unreachable"
const PROXY_ERROR_RE = /proxyerror|proxy error|host unreachable|connection refused|unable to connect to proxy|socks5? (?:handshake|error)|general socks server failure/i;

const isYoutubeTarget = (target) => /^ytsearch\d*:|youtube\.com|youtu\.be/i.test(target || '');

let downUntil = 0;           // solange > now gilt der Primaer-Proxy als tot
const listeners = [];

function parseProxy(proxy) {
    const m = /^[a-z0-9+.-]+:\/\/(?:[^@/]*@)?([^:/]+):(\d+)/i.exec(proxy || '');
    return m ? { host: m[1], port: Number(m[2]) } : null;
}

const hasFallback = () => Boolean(FALLBACK) && FALLBACK !== PRIMARY;
const state = () => (Date.now() < downUntil ? 'down' : 'up');
const activeProxy = () => (state() === 'down' && hasFallback() ? FALLBACK : PRIMARY);

function emit(next, reason) {
    for (const fn of listeners) {
        try { fn(next, reason); } catch (e) { console.error('ytProxy: Listener-Fehler:', e?.message || e); }
    }
}

// Primaer-Proxy als tot markieren. Wiederholte Meldungen verlaengern nur das
// Fenster; gemeldet wird ausschliesslich der Zustandswechsel.
function markDown(reason) {
    const wasUp = state() === 'up';
    downUntil = Date.now() + DOWN_MS;
    if (wasUp && hasFallback()) emit('down', reason);
    else if (wasUp) console.error(`ytProxy: Primaer-Proxy tot (${reason}) — keine Ausweich-Kette konfiguriert`);
}

function markUp(reason) {
    if (state() === 'down') { downUntil = 0; emit('up', reason); }
    else downUntil = 0;
}

const isProxyError = (message) => PROXY_ERROR_RE.test(String(message || ''));

/**
 * yt-dlp-Fehlertext bewerten. Gibt true zurueck, wenn es ein Proxy-Ausfall war
 * (dann hilft kein Quellenwechsel, sondern ein Retry ueber die Ausweich-Kette).
 * @param {string} message  stderr oder Fehlermeldung
 * @param {string} [target] URL/Suchbegriff — nicht-YouTube laeuft ohne Proxy
 */
function noteYtdlpError(message, target) {
    if (target !== undefined && !isYoutubeTarget(target)) return false;
    if (isDirect(PRIMARY) || !isProxyError(message)) return false;
    const line = String(message).trim().split('\n').pop().slice(0, 200);
    markDown(line);
    return true;
}

function argsForProxy(proxy) {
    if (isDirect(proxy)) return ['--remote-components', 'ejs:github'];
    return [
        '--proxy', proxy,
        '--remote-components', 'ejs:github',
        // Bewusst KEIN player_client=web: YouTube erzwingt dort SABR-Streaming,
        // die https-Formate fehlen -> "Requested format is not available" (2026-09-12).
        '--extractor-args', 'youtube:fetch_pot=always',
        '--extractor-args', `youtubepot-bgutilhttp:base_url=${POT_PROVIDER_URL}`,
    ];
}

// Nur YouTube braucht Proxy/POT. SoundCloud & Co. sind ueber WARP gar nicht
// erreichbar ("Host unreachable") und laufen direkt ueber die Server-IP.
const ytArgsFor = (target) => (isYoutubeTarget(target) ? argsForProxy(activeProxy()) : []);

// SoundCloud liefert bei Major-Label-Tracks oft nur 30-s-Vorschauen ("*_preview")
// -> ausschliessen, damit yt-dlp sauber scheitert statt still einen Schnipsel zu spielen.
const audioFormatFor = (target) => (/soundcloud\.com/i.test(target || '')
    ? 'bestaudio[format_id!*=preview]/best[format_id!*=preview]'
    : 'bestaudio/bestaudio*/best');

// Reiner TCP-Connect gegen den SOCKS-Port: Der ssh -R-Listener verschwindet,
// sobald der Pi weg ist — das ist das zuverlaessigste billige Signal.
function probe(proxy, timeoutMs = 5000) {
    const addr = parseProxy(proxy);
    if (!addr) return Promise.resolve(false);
    return new Promise((resolve) => {
        const sock = net.connect({ host: addr.host, port: addr.port });
        let settled = false;
        const done = (ok) => { if (!settled) { settled = true; sock.destroy(); resolve(ok); } };
        sock.setTimeout(timeoutMs);
        sock.once('connect', () => done(true));
        sock.once('timeout', () => done(false));
        sock.once('error', () => done(false));
    });
}

async function check() {
    if (await probe(PRIMARY)) markUp('TCP-Probe erfolgreich');
    else markDown('TCP-Probe fehlgeschlagen');
}

/**
 * Startet die Ueberwachung des Primaer-Proxys. No-op ohne Ausweich-Kette oder im
 * DIRECT-Modus. onChange('down'|'up', grund) meldet nur Zustandswechsel.
 */
function startWatch(onChange) {
    if (typeof onChange === 'function') listeners.push(onChange);
    if (isDirect(PRIMARY) || !hasFallback()) {
        console.log(`yt-dlp: Proxy ${isDirect(PRIMARY) ? 'DIRECT' : PRIMARY} (keine Ausweich-Kette)`);
        return null;
    }
    console.log(`yt-dlp: Proxy ${PRIMARY}, Ausweich-Proxy ${FALLBACK}`);
    const timer = setInterval(() => { check().catch(() => {}); }, CHECK_MS);
    timer.unref?.();          // darf "npm run deploy"/Skripte nicht am Leben halten
    check().catch(() => {});
    return timer;
}

// Kurzform fuers #status-Embed, Langform fuer Alerts.
const shortState = () => (isDirect(PRIMARY) ? 'direkt' : (state() === 'down' ? '⚠️ Ausweich-Proxy' : '✓ Primaer-Proxy'));
const describe = () => (isDirect(PRIMARY)
    ? 'direkt (ohne Proxy)'
    : (state() === 'down' && hasFallback() ? `${FALLBACK} (Ausweich, Primaer ${PRIMARY} tot)` : PRIMARY));

module.exports = {
    ytArgsFor, audioFormatFor, isYoutubeTarget,
    isProxyError, noteYtdlpError,
    startWatch, probe, check,
    state, activeProxy, describe, shortState, hasFallback,
    PRIMARY, FALLBACK, DOWN_MS, CHECK_MS,
};

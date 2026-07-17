// Zentrale Fehler-/Lifecycle-Benachrichtigung an einen Discord-Webhook.
// Von beiden Bots genutzt (Require-Pfad aus src/: ../../../libs/notify).
// Wird wie die uebrigen libs/-Dateien von den Bot-Dockerfiles mitkopiert.
//
// Zweck: Crashes/Fehler laufen sonst nur in console.error -> Coolify-Logs, die
// niemand aktiv beobachtet. Hiermit landet jeder Prozess-/Client-Fehler als
// Embed in einem (privaten) Discord-Kanal, plus ein "online"-Ping nach jedem
// (Re-)Start (= zuverlaessigstes Crash-Signal, da der Container nur nach einem
// Absturz neu hochfaehrt).
//
// Aktivierung ausschliesslich ueber die Env-Var ALERT_WEBHOOK_URL (in Prod via
// Coolify gesetzt, lokal MUSIC_/SOUNDBOARD_ALERT_WEBHOOK_URL in .env.local ->
// loadEnv mappt sie). Fehlt die Var, sind alle Funktionen No-ops.
// Nutzt natives fetch (Node 22) — keine zusaetzliche Dependency.

const WEBHOOK = process.env.ALERT_WEBHOOK_URL;

const COLORS = { error: 0xef4444, info: 0x22c55e };
const DEDUPE_MS = 60_000;   // identische Meldung fruehestens nach 60s erneut
const WINDOW_MS = 60_000;   // Flutschutz-Fenster
const MAX_PER_WINDOW = 5;   // hoechstens 5 Alerts pro Fenster

const _lastSent = new Map(); // dedupe-key -> timestamp
let _windowStart = 0;
let _windowCount = 0;

// true => unterdruecken. Deduped identische Meldungen und deckelt die Gesamtrate,
// damit eine Fehlerschleife nicht den Alert-Kanal (und das Webhook-Limit) flutet.
function _throttled(key) {
    const now = Date.now();
    const last = _lastSent.get(key);
    if (last && now - last < DEDUPE_MS) return true;
    _lastSent.set(key, now);
    // gelegentliches Aufraeumen alter Eintraege
    if (_lastSent.size > 200) {
        for (const [k, t] of _lastSent) if (now - t > DEDUPE_MS) _lastSent.delete(k);
    }
    if (now - _windowStart > WINDOW_MS) { _windowStart = now; _windowCount = 0; }
    if (_windowCount >= MAX_PER_WINDOW) return true;
    _windowCount++;
    return false;
}

// Fire-and-forget-Post. Ein Webhook-Fehler darf den Bot nie beeintraechtigen.
function _send(payload) {
    if (!WEBHOOK) return;
    fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).catch(e => console.error('notify: Webhook-Post fehlgeschlagen:', e?.message || e));
}

/**
 * Fehler-Alert an den Webhook. No-op ohne ALERT_WEBHOOK_URL.
 * @param {string} bot     - Botname ('BeatByte' | 'EarTastic')
 * @param {string} title   - kurze Ueberschrift, z.B. 'uncaughtException'
 * @param {any}    err      - Error-Objekt oder String
 * @param {string} [context] - optionaler Zusatzkontext
 */
function notifyError(bot, title, err, context) {
    if (!WEBHOOK) return;
    const msg = err?.message || String(err ?? 'Unbekannter Fehler');
    if (_throttled(`${bot}:${title}:${msg}`)) return;

    const fields = [];
    if (context) fields.push({ name: 'Kontext', value: String(context).slice(0, 1024) });
    if (err?.stack) {
        const stack = String(err.stack).split('\n').slice(0, 6).join('\n').slice(0, 1000);
        fields.push({ name: 'Stack', value: '```\n' + stack + '\n```' });
    }

    _send({
        username: `${bot} Alerts`,
        embeds: [{
            title: `🔴 ${bot}: ${title}`.slice(0, 256),
            description: msg.slice(0, 2000),
            color: COLORS.error,
            fields,
            timestamp: new Date().toISOString(),
        }],
    });
}

/**
 * Lifecycle-Ping (Bot online nach (Re-)Start). No-op ohne ALERT_WEBHOOK_URL.
 * Nicht gedrosselt — laeuft pro Prozessstart nur einmal.
 * @param {string} bot      - Botname
 * @param {string} [detail] - z.B. "als BeatByte#1234"
 */
function notifyOnline(bot, detail) {
    if (!WEBHOOK) return;
    _send({
        username: `${bot} Alerts`,
        embeds: [{
            title: `🟢 ${bot} online`,
            description: detail ? String(detail).slice(0, 2000) : undefined,
            color: COLORS.info,
            timestamp: new Date().toISOString(),
        }],
    });
}

module.exports = { notifyError, notifyOnline };

// Periodischer Status-Post in einen #status-Kanal. Jeder Bot pflegt GENAU EINE
// eigene Nachricht ("🟢 BeatByte — Online · aktualisiert vor X"), die alle
// UPDATE_MS neu geschrieben wird. Bei einem (Re-)Start wird die vorhandene
// eigene Nachricht wiederverwendet (per Author-ID im Kanal gesucht) statt eine
// neue zu posten -> keine Karteileichen.
//
// Von beiden Bots genutzt (Require-Pfad aus src/: ../../../libs/status), wird
// wie die uebrigen libs/-Dateien von den Bot-Dockerfiles mitkopiert.
//
// Aktivierung ausschliesslich ueber STATUS_CHANNEL_ID (Kanal-ID des #status-
// Kanals; in Prod via Coolify, lokal MUSIC_/SOUNDBOARD_STATUS_CHANNEL_ID ->
// loadEnv mappt sie). Fehlt die Var, ist der Updater ein No-op. Der Bot muss
// den Kanal sehen und dort schreiben + die History lesen duerfen (View Channel,
// Send Messages, Embed Links, Read Message History) — Message-Content-Intent
// ist NICHT noetig (wir lesen nur die AUTOR-ID der eigenen Nachricht).
//
// Bewusst KEIN Webhook wie in notify.js: Webhooks koennen ihre eigenen
// Nachrichten nicht auffinden -> nach einem Restart gaebe es Duplikate. Ueber
// den Bot-Client laesst sich die eigene Nachricht per Author-ID wiederfinden.

const UPDATE_MS = 5 * 60_000; // alle 5 min aktualisieren
const FETCH_LIMIT = 50;       // #status ist ein Low-Traffic-Kanal (nur die Status-Msgs)

const COLORS = { online: 0x22c55e, offline: 0xef4444 };

// Baut das Status-Embed aus dem vom Bot gelieferten State.
// state: { online?: boolean, guilds?: number, extra?: { [label]: value } }
function buildEmbed(botName, emoji, state = {}) {
    const online = state.online !== false;
    const nowSec = Math.floor(Date.now() / 1000);
    const fields = [{ name: 'Server', value: String(state.guilds ?? '—'), inline: true }];
    if (state.extra) {
        for (const [name, value] of Object.entries(state.extra)) {
            fields.push({ name, value: String(value), inline: true });
        }
    }
    return {
        title: `${emoji} ${botName}`,
        color: online ? COLORS.online : COLORS.offline,
        description: `${online ? '🟢' : '🔴'} **${online ? 'Online' : 'Offline'}** · aktualisiert <t:${nowSec}:R>`,
        fields,
        timestamp: new Date().toISOString(),
    };
}

// Sucht die eigene (vom Bot verfasste) Status-Nachricht im Kanal. null, wenn keine.
async function findOwnMessage(channel, selfId) {
    try {
        const msgs = await channel.messages.fetch({ limit: FETCH_LIMIT });
        return msgs.find(m => m.author?.id === selfId) || null;
    } catch {
        return null;
    }
}

// Einmalig aktualisieren: State holen, Embed bauen, eigene Nachricht editieren
// oder (erstmalig) neu posten. Schluckt alle Fehler — Status darf den Bot nie stoeren.
async function postOnce(client, channel, botName, emoji, getState) {
    let state;
    try { state = await getState(); } catch { state = { online: true }; }
    const embed = buildEmbed(botName, emoji, state);
    try {
        const existing = await findOwnMessage(channel, client.user.id);
        const res = existing
            ? await existing.edit({ embeds: [embed] })
            : await channel.send({ embeds: [embed] });
        // Discord verwirft Embeds STILL (kein Fehler!), wenn EMBED_LINKS im Kanal
        // fehlt — dann steht dort eine leere Nachricht. Sichtbar machen statt schweigen.
        if (!res?.embeds?.length) {
            console.log(
                `status: Embed wurde verworfen (${botName}) — fehlt EMBED_LINKS in #${channel.name}? ` +
                `Gesendet: ${JSON.stringify(embed).slice(0, 400)}`
            );
        }
    } catch (e) {
        console.log('status: Update fehlgeschlagen:', e?.message || e);
    }
}

/**
 * Startet den periodischen Status-Updater. No-op ohne STATUS_CHANNEL_ID.
 * @param {object}   o
 * @param {object}   o.client   - eingeloggter discord.js-Client
 * @param {string}   o.botName  - z.B. 'BeatByte'
 * @param {string}   o.emoji    - Identitaets-Emoji, z.B. '🎵'
 * @param {Function} o.getState - () => ({ online?, guilds?, extra? }) (sync oder async)
 * @returns {NodeJS.Timeout|undefined} der Interval-Timer (unref'd) oder undefined im No-op
 */
function startStatusUpdater({ client, botName, emoji, getState }) {
    const channelId = process.env.STATUS_CHANNEL_ID;
    if (!channelId) return; // No-op — Feature nur mit gesetzter Env aktiv

    const run = async () => {
        let channel;
        try { channel = await client.channels.fetch(channelId); } catch { return; }
        if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return;
        await postOnce(client, channel, botName, emoji, getState);
    };

    run(); // sofort beim Start
    const timer = setInterval(run, UPDATE_MS);
    // Darf den Event-Loop nie offen halten (npm run deploy / Shutdown), vgl. rateLimiter.
    if (typeof timer.unref === 'function') timer.unref();
    return timer;
}

module.exports = { startStatusUpdater, buildEmbed, findOwnMessage, postOnce };

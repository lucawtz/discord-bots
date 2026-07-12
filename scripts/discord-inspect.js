#!/usr/bin/env node
/**
 * Read-only Inspektor fuer den ByteBots-Support-Server.
 *
 * Zweck: Den Discord-Server (Kanaele, Rollen, Community-/Onboarding-Status)
 * ueber die Discord-REST-API auslesen, damit Claude/Tooling den Ist-Zustand
 * kennt, ohne die Discord-UI. Nur REST v10 → KEINE Gateway-Verbindung,
 * KEINE privilegierten Intents noetig. Der Bot muss lediglich Mitglied des
 * Servers sein und "Kanaele ansehen" haben.
 *
 * Token/Config kommen aus der Root-.env.local (gitignored):
 *   ADMIN_DISCORD_TOKEN   Bot-Token eines Mitglieds des Support-Servers.
 *                         Empfehlung: eigener read-only Bot ("ByteBots Admin"),
 *                         NICHT der Prod-Token. Alias: SUPPORT_BOT_TOKEN.
 *   SUPPORT_GUILD_ID      Default: 1525977525400895668 (ByteBots Support).
 *
 * Aufruf:  node scripts/discord-inspect.js
 * Dieses Skript liegt bewusst unter scripts/ (nicht unter bots/<bot>/src) und
 * wird von keinem Dockerfile ins Image kopiert.
 */

const fs = require('fs');
const path = require('path');

// --- .env.local minimal parsen (keine externe Abhaengigkeit) ---
function loadDotenvLocal() {
    const file = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(file)) return {};
    const out = {};
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    }
    return out;
}

const env = { ...loadDotenvLocal(), ...process.env };
const TOKEN = (env.ADMIN_DISCORD_TOKEN || env.SUPPORT_BOT_TOKEN || '').trim();
const GUILD_ID = (env.SUPPORT_GUILD_ID || '1525977525400895668').trim();
const API = 'https://discord.com/api/v10';

if (!TOKEN) {
    console.error(`
✗ Kein Token gefunden.

  Setze in der Root-.env.local eine dieser Zeilen:
      ADMIN_DISCORD_TOKEN=<Token eines Bots, der auf dem Support-Server ist>

  Empfohlen: eigener read-only Bot ("ByteBots Admin") im Developer Portal
  anlegen, mit "Kanaele ansehen" auf den Server einladen, dessen Token hier
  eintragen. Damit bleibt der Prod-Bot-Token unberuehrt.
`);
    process.exit(1);
}

async function api(pathname) {
    const res = await fetch(`${API}${pathname}`, {
        headers: { Authorization: `Bot ${TOKEN}` },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`${res.status} ${res.statusText} @ ${pathname} — ${body}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

// --- Discord-Kanaltypen → lesbar ---
const CH = {
    0:  ['#',  'Text'],
    2:  ['🔊', 'Voice'],
    4:  ['📁', 'Kategorie'],
    5:  ['📢', 'Ankuendigung'],
    13: ['🎙️', 'Stage'],
    15: ['🗂️', 'Forum'],
    16: ['🖼️', 'Media'],
};
const chLabel = (t) => (CH[t] ? CH[t][0] : '?');
const chType = (t) => (CH[t] ? CH[t][1] : `Typ ${t}`);

// Boost-Tier lesbar
const TIER = { 0: 'kein Boost-Level', 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' };
const VERIF = { 0: 'keine', 1: 'niedrig', 2: 'mittel', 3: 'hoch', 4: 'sehr hoch' };

function hr(title) {
    console.log('\n' + '─'.repeat(64));
    console.log(title);
    console.log('─'.repeat(64));
}

(async () => {
    // Identitaet
    let me;
    try {
        me = await api('/users/@me');
    } catch (e) {
        if (e.status === 401) {
            console.error('✗ Token ungueltig (401). Bitte ADMIN_DISCORD_TOKEN pruefen.');
            process.exit(1);
        }
        throw e;
    }
    console.log(`✓ Eingeloggt als: ${me.username} (${me.id})`);

    // Sicherheits-Nudge: laeuft das Tool mit einem der PROD-Bot-Tokens?
    const PROD_BOTS = { '1488919318472298647': 'BeatByte', '1488966705488330932': 'EarTastic' };
    if (PROD_BOTS[me.id]) {
        console.log(`⚠  Achtung: Das ist der PROD-Token von ${PROD_BOTS[me.id]}. Fuer die`);
        console.log(`   Inspektion besser einen eigenen read-only "ByteBots Admin"-Bot anlegen`);
        console.log(`   und ADMIN_DISCORD_TOKEN darauf umstellen (siehe .env.local.example).`);
    }

    // Guild-Overview
    let g;
    try {
        g = await api(`/guilds/${GUILD_ID}?with_counts=true`);
    } catch (e) {
        if (e.status === 403 || e.status === 404) {
            console.error(`
✗ Bot hat keinen Zugriff auf Guild ${GUILD_ID} (${e.status}).
  Der Bot "${me.username}" ist NICHT Mitglied des Support-Servers.
  Lade ihn ueber den OAuth2-URL-Generator (scope=bot) auf den Server ein
  und gib ihm mindestens "Kanaele ansehen".`);
            process.exit(1);
        }
        throw e;
    }

    hr(`SERVER: ${g.name}`);
    console.log(`  ID:            ${g.id}`);
    if (g.description) console.log(`  Beschreibung:  ${g.description}`);
    console.log(`  Mitglieder:    ~${g.approximate_member_count ?? '?'} (online ~${g.approximate_presence_count ?? '?'})`);
    console.log(`  Boosts:        ${TIER[g.premium_tier] ?? g.premium_tier} · ${g.premium_subscription_count ?? 0} Booster`);
    console.log(`  Verifizierung: ${VERIF[g.verification_level] ?? g.verification_level}`);
    console.log(`  Vanity-URL:    ${g.vanity_url_code ? 'discord.gg/' + g.vanity_url_code : '— (keine)'}`);
    console.log(`  Icon/Banner:   Icon ${g.icon ? '✓' : '✗'} · Banner ${g.banner ? '✓' : '✗'} · Splash ${g.splash ? '✓' : '✗'}`);
    console.log(`  Features:      ${(g.features && g.features.length) ? g.features.join(', ') : '—'}`);
    const community = g.features && g.features.includes('COMMUNITY');
    console.log(`  Community:     ${community ? '✓ aktiv' : '✗ NICHT aktiv'}`);

    // Kanaele als Baum
    const channels = await api(`/guilds/${GUILD_ID}/channels`);
    const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0);
    const cats = channels.filter((c) => c.type === 4).sort(byPos);
    const childrenOf = (id) => channels.filter((c) => c.type !== 4 && (c.parent_id ?? null) === id).sort(byPos);

    const printChannel = (c, indent) => {
        const tags = Array.isArray(c.available_tags) && c.available_tags.length
            ? `  [Tags: ${c.available_tags.map((t) => t.name).join(', ')}]` : '';
        const topic = c.topic ? `  — ${c.topic.replace(/\s+/g, ' ').slice(0, 60)}` : '';
        console.log(`${indent}${chLabel(c.type)} ${c.name}  (${chType(c.type)})${tags}${topic}`);
    };

    hr(`KANAELE (${channels.length})`);
    for (const c of childrenOf(null)) printChannel(c, '  ');   // ohne Kategorie
    for (const cat of cats) {
        console.log(`\n  📁 ${cat.name.toUpperCase()}`);
        const kids = childrenOf(cat.id);
        if (!kids.length) console.log('     (leer)');
        for (const c of kids) printChannel(c, '     ');
    }

    // Rollen
    const roles = (await api(`/guilds/${GUILD_ID}/roles`)).sort((a, b) => b.position - a.position);
    hr(`ROLLEN (${roles.length})`);
    for (const r of roles) {
        if (r.name === '@everyone') continue;
        const flags = [
            r.hoist ? 'separat angezeigt' : null,
            r.managed ? 'bot/integration' : null,
            r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
        ].filter(Boolean).join(', ');
        console.log(`  • ${r.name}${flags ? '  (' + flags + ')' : ''}`);
    }

    // Onboarding + Welcome Screen (best effort)
    try {
        const ob = await api(`/guilds/${GUILD_ID}/onboarding`);
        hr('ONBOARDING');
        console.log(`  Aktiviert: ${ob.enabled ? '✓' : '✗'} · Modus: ${ob.mode === 1 ? 'erweitert' : 'standard'}`);
        console.log(`  Prompts:   ${Array.isArray(ob.prompts) ? ob.prompts.length : 0}`);
        for (const p of ob.prompts || []) {
            console.log(`    - ${p.title} (${(p.options || []).length} Optionen)`);
        }
    } catch { /* Onboarding ggf. nicht verfuegbar */ }

    try {
        const ws = await api(`/guilds/${GUILD_ID}/welcome-screen`);
        hr('WILLKOMMENSBILDSCHIRM');
        console.log(`  Beschreibung: ${ws.description || '—'}`);
        for (const c of ws.welcome_channels || []) {
            console.log(`    - ${c.description}`);
        }
    } catch { /* Welcome Screen ggf. deaktiviert */ }

    console.log('\n✓ Fertig.\n');
})().catch((e) => {
    console.error('✗ Fehler:', e.message);
    process.exit(1);
});

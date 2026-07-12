const fs = require('fs');
const path = require('path');

/**
 * Laedt die Env-Variablen eines Bots. Reihenfolge (frueher gewinnt):
 *  1. Bereits gesetzte Umgebungsvariablen — in Prod kommen ALLE Werte so
 *     aus Coolify; die Dateien unten existieren im Container nicht,
 *     weil .dockerignore alle .env-Dateien blockt. Dann: No-op.
 *  2. bots/<bot>/.env (optionaler Spezialfall, normalerweise nicht vorhanden)
 *  3. Root-.env.local: EINE Datei fuer beide Bots. Variablen mit dem
 *     Bot-Praefix (z.B. MUSIC_DISCORD_TOKEN, SOUNDBOARD_API_KEY) werden
 *     ohne Praefix nach process.env uebernommen.
 *
 * @param {string} prefix - 'MUSIC' oder 'SOUNDBOARD'
 * @param {string} botDir - Absoluter Pfad zum Bot-Ordner (fuer 2.)
 */
function loadEnv(prefix, botDir) {
    if (botDir) {
        const botEnv = path.join(botDir, '.env');
        if (fs.existsSync(botEnv)) require('dotenv').config({ path: botEnv });
    }

    const localFile = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(localFile)) return;

    const parsed = require('dotenv').parse(fs.readFileSync(localFile));
    for (const [key, value] of Object.entries(parsed)) {
        if (!key.startsWith(prefix + '_')) continue;
        const name = key.slice(prefix.length + 1);
        if (!(name in process.env)) process.env[name] = value;
    }
}

module.exports = { loadEnv };

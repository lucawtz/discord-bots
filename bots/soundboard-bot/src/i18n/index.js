// Bindet den DE/EN-Katalog an die geteilte i18n-Basis (libs/i18n.js).
// Anders als beim music-bot gibt es hier kein ctx — die Commands bekommen nur
// die Interaction. Deshalb bringt dieses Modul die Locale-Aufloesung selbst mit.
const de = require('./de');
const en = require('./en');
const { createI18n, normalizeLocale } = require('../../../../libs/i18n');

const { t } = createI18n({ de, en }, 'de');

// db lazy laden (vermeidet Zyklus beim Modul-Laden; zur Laufzeit ist db init'd).
function storedLang(guildId) {
    if (!guildId) return null;
    try {
        const db = require('../database');
        const lang = db.getGuildSettings(guildId).language;
        return (lang === 'de' || lang === 'en') ? lang : null;
    } catch { return null; }
}

// Sprache pro Server: Einstellung (guild_settings.language) > Server-Locale >
// User-Locale > 'de'.
function localeFor(interaction) {
    return storedLang(interaction.guildId)
        || normalizeLocale(interaction.guildLocale)
        || normalizeLocale(interaction.locale)
        || 'de';
}

// Fuer Kontexte ohne Interaction: nur die Server-Einstellung, sonst 'de'.
function localeForGuild(guildId) {
    return storedLang(guildId) || 'de';
}

module.exports = { t, normalizeLocale, localeFor, localeForGuild };

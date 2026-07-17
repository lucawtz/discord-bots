/**
 * Geteilte i18n-Basis fuer beide Bots (wird per Dockerfile in die Bots kopiert).
 *
 * Jeder Bot bringt seinen eigenen String-Katalog mit (src/i18n/de.js + en.js) und
 * baut sich daraus per createI18n() ein t(key, locale, vars). Katalog-Werte sind
 * entweder Strings mit {var}-Platzhaltern oder Funktionen (vars) => string
 * (fuer Plural-/Bedingungslogik). Fehlt ein Key in der Ziel-Sprache, faellt t()
 * auf die Default-Sprache zurueck, dann auf den Key selbst (nie ein Crash).
 */

const SUPPORTED = ['de', 'en'];

/**
 * Bildet einen Discord-Locale-String (z.B. 'de', 'en-US', 'en-GB', 'fr') auf
 * unsere unterstuetzten Sprachen ab. Deutsch -> 'de', alles andere -> 'en'.
 * @returns {'de'|'en'|null} null, wenn kein Locale uebergeben wurde.
 */
function normalizeLocale(discordLocale) {
    if (!discordLocale) return null;
    return String(discordLocale).toLowerCase().startsWith('de') ? 'de' : 'en';
}

/**
 * Baut aus einem Katalog { de: {...}, en: {...} } eine t-Funktion.
 * @param {Record<string, Record<string, string|Function>>} catalog
 * @param {string} defaultLocale
 * @returns {{ t: (key: string, locale?: string, vars?: object) => string, SUPPORTED: string[] }}
 */
function createI18n(catalog, defaultLocale = 'de') {
    function t(key, locale, vars) {
        const lang = catalog[locale] ? locale : defaultLocale;
        let value = catalog[lang] && catalog[lang][key];
        if (value == null) value = catalog[defaultLocale] && catalog[defaultLocale][key];
        if (value == null) return key; // nie crashen: schlimmstenfalls den Key zeigen
        let str = typeof value === 'function' ? value(vars || {}) : value;
        if (vars && typeof str === 'string') {
            for (const k of Object.keys(vars)) {
                str = str.split('{' + k + '}').join(String(vars[k]));
            }
        }
        return str;
    }
    return { t, SUPPORTED };
}

module.exports = { normalizeLocale, createI18n, SUPPORTED };

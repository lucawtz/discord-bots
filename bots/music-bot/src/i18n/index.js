// Bindet den DE/EN-Katalog an die geteilte i18n-Basis (libs/i18n.js).
const de = require('./de');
const en = require('./en');
const { createI18n, normalizeLocale } = require('../../../../libs/i18n');

const { t } = createI18n({ de, en }, 'de');

module.exports = { t, normalizeLocale };

// Prueft die Deezer-Anbindung gegen die ECHTE API — sie traegt die Sofort-Karte
// und das Autocomplete. Laeuft nur mit TEST_NETWORK=1, damit `npm test` offline
// und in CI ohne Netz gruen bleibt:
//   TEST_NETWORK=1 node --test test/deezer.test.js
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const { ctx } = require('../src/index.js');

const online = process.env.TEST_NETWORK === '1';

test('deezerSuggest liefert brauchbare Vorschlaege', { skip: online ? false : 'TEST_NETWORK=1 setzen' }, async () => {
    const t0 = Date.now();
    const hits = await ctx.deezerSuggest('g wagon gzuz', 5);
    const ms = Date.now() - t0;

    assert.ok(hits.length > 0, 'mindestens ein Treffer');
    assert.ok(ms < 3000, `unter dem 3s-Autocomplete-Limit von Discord (war ${ms}ms)`);

    for (const hit of hits) {
        assert.ok(hit.title && hit.artist, 'Titel und Interpret gesetzt');
        assert.ok(hit.query.length <= 100, `Autocomplete-Wert max. 100 Zeichen (war ${hit.query.length})`);
        assert.match(hit.duration, /^\d+:\d{2}$/, 'Dauer formatiert');
    }
    assert.match(hits[0].title, /G Wagon/i, 'Top-Treffer passt zur Anfrage');
});

test('quickMeta liefert die Daten fuer die Sofort-Karte', { skip: online ? false : 'TEST_NETWORK=1 setzen' }, async () => {
    const meta = await ctx.quickMeta('queen bohemian rhapsody');
    assert.ok(meta, 'Treffer vorhanden');
    assert.match(meta.artist, /Queen/i);
    assert.ok(meta.albumArt?.startsWith('https://'), 'quadratisches Cover als URL');
    assert.ok(meta.durationSec > 60, 'plausible Laenge');
});

test('quickMeta gibt bei Unsinn null statt zu werfen', { skip: online ? false : 'TEST_NETWORK=1 setzen' }, async () => {
    const meta = await ctx.quickMeta('zzzqqqxxx-kein-song-' + Date.now());
    assert.strictEqual(meta, null);
});

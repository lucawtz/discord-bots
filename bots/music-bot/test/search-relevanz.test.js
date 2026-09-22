// Der Bot soll lieber sagen "nicht gefunden" als etwas Fremdes spielen.
//
// Anlass ist ein echter Fall vom 2026-09-22: die Anfrage "stieftochter massaker"
// liess den Bot "Heroin an Heiligabend" abspielen. Die Trefferliste in
// fixtures-data/ ist genau die, die YouTube an dem Tag geliefert hat — der
// gesuchte Song kommt darin gar nicht vor. (Er existiert, aber nur auf
// SoundCloud; dorthin faellt die Suche jetzt korrekt durch.)
//
// Bewusst ohne Netz: geprueft wird die ENTSCHEIDUNGSREGEL, nicht die Kette aus
// Piped, YouTube und SoundCloud. Die haengt an fremden Diensten und gehoert
// nicht in eine Suite, die in fuenf Sekunden durchlaufen soll.
process.env.BEATBYTE_TEST = '1';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { ctx } = require('../src/index.js');

const SCHWELLE = require('../src/index.js').ctx.MIN_QUERY_COVERAGE;
const echt = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures-data', 'ytsearch-stieftochter-massaker.json'), 'utf8'),
);

test('queryCoverage misst, wie viel der Anfrage im Treffer steckt', () => {
    assert.strictEqual(
        ctx.queryCoverage({ title: 'Gzuz - G Wagon', channel: 'CrhymeTV' }, 'Gzuz G Wagon'), 1);

    assert.strictEqual(
        ctx.queryCoverage({ title: 'Heroin an Heiligabend', channel: 'ChrispyyChris - Topic' },
            'stieftochter massaker'), 0);

    assert.strictEqual(
        ctx.queryCoverage({ title: 'Queen – Bohemian Rhapsody (Official Video)', channel: 'Queen Official' },
            'queen bohemian rhapsody'), 1);

    // Umlaute und Schreibweisen duerfen nicht durchfallen
    assert.strictEqual(
        ctx.queryCoverage({ title: 'Millionär', channel: 'Rasmus Seebach' }, 'millionaer'), 1);

    // Zu kurze Anfragen lassen sich nicht sinnvoll pruefen -> durchlassen,
    // statt den Nutzer grundlos abzuweisen.
    assert.strictEqual(ctx.queryCoverage({ title: 'egal', channel: 'egal' }, 'ab cd'), 1);

    // Der Grund fuer die Schwelle ueber 0,5: ein einziges geteiltes Wort aus
    // zwei genuegt sonst.
    const halb = ctx.queryCoverage(
        { title: 'Asylbewerber kocht seine Stieftochter', channel: 'C. W.' }, 'stieftochter massaker');
    assert.strictEqual(halb, 0.5);
    assert.ok(halb < SCHWELLE, 'die Haelfte darf nicht reichen');
});

test('der echte Fall: KEIN Treffer der Liste haelt der Anfrage stand', () => {
    const bestanden = echt.entries.filter(
        e => ctx.queryCoverage(e, echt.query) >= SCHWELLE);

    assert.deepStrictEqual(bestanden, [],
        'Diese YouTube-Liste enthaelt den gesuchten Song nicht — es darf keiner '
        + 'durchkommen. Vorher spielte der Bot hier "Heroin an Heiligabend".');

    // Der Treffer, der damals gespielt wurde, muss klar durchfallen.
    const damals = echt.entries.find(e => /Heroin an Heiligabend/.test(e.title));
    assert.ok(damals, 'Fixture muss den damaligen Fehltreffer enthalten');
    assert.ok(ctx.queryCoverage(damals, echt.query) < SCHWELLE);
});

test('ein passender Treffer in derselben Liste kaeme durch', () => {
    // Gegenprobe: waere der richtige Song dabei gewesen, haette er bestanden.
    const mitRichtigem = [
        ...echt.entries,
        { title: 'JATSKi, EMI515 & QUITSCHI - Stieftochter Massaker', channel: 'killy ist high af', duration: 150 },
    ];
    const bestanden = mitRichtigem.filter(e => ctx.queryCoverage(e, echt.query) >= SCHWELLE);

    assert.strictEqual(bestanden.length, 1);
    assert.match(bestanden[0].title, /Stieftochter Massaker/);
});

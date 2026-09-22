// BUG-2 aus BUGS.md: "Bot verlaesst den Channel nicht mehr automatisch, wenn
// nichts gespielt wird." Ursache: scheduleLeave wurde nur gerufen, wenn die
// Warteschlange leerlief oder jemand /stop drueckte — NICHT beim Verbinden.
// Wer den Bot per /join oder ueber den Web-Player holte und nichts abspielte,
// hatte ihn fuer immer im Kanal.
process.env.BEATBYTE_TEST = '1';
process.env.LEAVE_TIMEOUT_MS = '700';

const test = require('node:test');
const assert = require('node:assert');

const { ctx } = require('../src/index.js');
const { createLog, fakeChannel } = require('./fakes');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('ohne Wiedergabe raeumt der Timer die Queue ab', async () => {
    const log = createLog();
    const queue = ctx.getQueue('leave-1');
    queue.channel = fakeChannel(log);

    ctx.scheduleLeave('leave-1');
    assert.ok(queue.leaveTimer, 'der Timer muss gestellt sein');

    await sleep(1100);
    assert.strictEqual(ctx.queues.has('leave-1'), false,
        'nach Ablauf ohne laufenden Track muss die Queue weg sein');
});

test('waehrend etwas laeuft bleibt der Bot', async () => {
    const log = createLog();
    const queue = ctx.getQueue('leave-2');
    queue.channel = fakeChannel(log);
    queue.current = { title: 'laeuft', url: 'https://youtu.be/x' };

    ctx.scheduleLeave('leave-2');
    await sleep(1100);

    assert.ok(ctx.queues.has('leave-2'),
        'ein laufender Track darf nicht rausgeworfen werden');
    ctx.queues.delete('leave-2');
});

test('ein neuer Aufruf verlaengert, statt doppelt zu zaehlen', async () => {
    const log = createLog();
    const queue = ctx.getQueue('leave-3');
    queue.channel = fakeChannel(log);

    ctx.scheduleLeave('leave-3');
    const ersterTimer = queue.leaveTimer;
    await sleep(350);
    ctx.scheduleLeave('leave-3');          // z.B. weil jemand /join erneut ruft

    assert.notStrictEqual(queue.leaveTimer, ersterTimer, 'neuer Timer');
    await sleep(500);                       // insgesamt 850ms — mit Verlaengerung noch da
    assert.ok(ctx.queues.has('leave-3'), 'die Frist beginnt neu');

    await sleep(500);
    assert.strictEqual(ctx.queues.has('leave-3'), false, 'danach aber doch');
});

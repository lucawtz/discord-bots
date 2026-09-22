#!/usr/bin/env node
/**
 * Postet NEU hinzugekommene CHANGELOG.md-Eintraege in einen Discord-#changelog-Kanal.
 *
 * Warum ein CI-Skript und kein Bot-Feature:
 *   - Die CHANGELOG.md liegt im Repo-Root und wird bewusst in KEIN Bot-Image kopiert
 *     (die Dockerfiles machen nur `COPY libs`). Ein Bot koennte sie zur Laufzeit gar
 *     nicht lesen.
 *   - "Neu" ist ein Git-Begriff: der Push liefert genau den before..after-Bereich.
 *     In der CI ist die History da -> ein Diff sagt exakt, welche Bullets dieser Push
 *     hinzugefuegt hat. Kein "zuletzt gepostet"-State noetig.
 *
 * Eingehaengt in .github/workflows/ci.yml als eigener Job `changelog-notify`, der nur
 * bei push auf prod UND nach gruenem Build laeuft (needs: lint-and-build) —
 * ein Changelog fuer einen kaputten Build waere schlimmer als keiner.
 *
 * Aktivierung ausschliesslich ueber die Env-Var CHANGELOG_WEBHOOK_URL (GitHub-Actions-
 * Secret; Discord-Kanal-Webhook fuer #changelog). Fehlt sie, ist das Skript ein No-op.
 * Es beendet sich IMMER mit Exit-Code 0 — eine Ankuendigung darf den Deploy nie brechen.
 *
 * Bereich (before..after) kommt aus den GitHub-Actions-Kontextvariablen:
 *   BEFORE_SHA (github.event.before) .. AFTER_SHA (github.sha)
 * Fallbacks fuer den ersten Push auf einen Branch (before = 000..0) unten.
 *
 * Nur Node-Builtins (child_process + natives fetch aus Node 22) -> keine Dependency,
 * kein Lockfile-Update.
 *
 * Lokal testen (ohne echten Webhook, druckt die Payloads statt zu posten):
 *   node scripts/post-changelog.js --dry-run <before-sha> <after-sha>
 *   z.B.  node scripts/post-changelog.js --dry-run 0d2ce72 50bc5db
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const CHANGELOG = 'CHANGELOG.md';
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'; // git's leerer Baum
const ZERO_SHA = '0000000000000000000000000000000000000000';

// Discord-Limits
const MAX_DESC = 4096;   // Embed-Description
const MAX_AUTHOR = 256;  // Author-Name
const MAX_EMBEDS = 10;   // Embeds pro Webhook-POST

// Bereich-Praefix (`**music-bot:**` ...) -> Farbe + Emoji + Label fuers Embed.
const AREAS = {
    'music-bot':      { emoji: '🎵', label: 'BeatByte',   color: 0x6E41CC },
    'soundboard-bot': { emoji: '🔊', label: 'EarTastic',  color: 0x22c55e },
    'website':        { emoji: '🌐', label: 'Website',    color: 0x3b82f6 },
    'infra':          { emoji: '🔧', label: 'Infra',      color: 0x64748b },
    'docs':           { emoji: '📝', label: 'Docs',       color: 0xa855f7 },
};
const DEFAULT_AREA = { emoji: '📝', label: 'ByteBots', color: 0x6E41CC };

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const positional = args.filter(a => !a.startsWith('--'));

const WEBHOOK = process.env.CHANGELOG_WEBHOOK_URL;
const BEFORE = process.env.BEFORE_SHA || positional[0] || '';
const AFTER = process.env.AFTER_SHA || positional[1] || 'HEAD';

function git(...gitArgs) {
    return execFileSync('git', gitArgs, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// Prueft, ob ein Commit-ish im lokalen Repo aufloesbar ist.
function resolvable(ref) {
    if (!ref || ref === ZERO_SHA) return false;
    try { git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`); return true; }
    catch { return false; }
}

// Bestimmt den Diff-Startpunkt. Normalfall: BEFORE. Beim ersten Push auf einen Branch
// ist github.event.before = 000..0 -> Fallback auf den Eltern-Commit von AFTER, und
// wenn auch der fehlt (allererster Commit), gegen den leeren Baum.
function resolveBase() {
    if (resolvable(BEFORE)) return BEFORE;
    if (resolvable(`${AFTER}~1`)) return `${AFTER}~1`;
    return EMPTY_TREE;
}

// Liefert die neu hinzugekommenen Bullets aus dem CHANGELOG.md-Diff.
// -U100: grosser Kontext, damit der zugehoerige `## YYYY-MM-DD`-Header (der beim
// Anhaengen an ein bestehendes Datum UNVERAENDERT ist, also nicht im +-Teil steht)
// mit im Hunk liegt und pro Bullet als Datum zugeordnet werden kann.
function collectNewBullets(base) {
    let diff;
    try {
        diff = git('diff', '-U100', '--no-color', base, AFTER, '--', CHANGELOG);
    } catch (e) {
        console.error('post-changelog: git diff fehlgeschlagen:', e.message);
        return [];
    }
    if (!diff.trim()) return [];

    const bullets = [];
    let current = null;                 // offener Bullet { date, lines[] }
    let currentDate = null;             // zuletzt gesehener `## YYYY-MM-DD`-Header
    const DATE_RE = /^##\s+(\d{4}-\d{2}-\d{2})/;
    const BULLET_RE = /^\s*-\s+(.*)$/;

    const finish = () => {
        if (current && current.lines.join('\n').trim()) bullets.push(current);
        current = null;
    };

    for (const raw of diff.split('\n')) {
        // Datei-/Hunk-Metazeilen ueberspringen.
        if (raw.startsWith('+++') || raw.startsWith('---') ||
            raw.startsWith('diff ') || raw.startsWith('index ') || raw.startsWith('@@')) {
            continue;
        }

        const marker = raw[0];          // '+', '-', ' ' (Kontext) oder '' (Leerzeile)
        const text = raw.slice(1);      // Zeileninhalt ohne Diff-Marker

        // Datum aus JEDER Zeile mitnehmen (Kontext ODER hinzugefuegt), in Lesereihenfolge.
        const dm = text.match(DATE_RE);
        if (dm) { currentDate = dm[1]; finish(); continue; }

        if (marker === '+') {
            const bm = text.match(BULLET_RE);
            if (bm) {                    // neuer Bullet beginnt
                finish();
                current = { date: currentDate, lines: [bm[1]] };
            } else if (text.trim() === '') {
                finish();                // Leerzeile trennt Eintraege
            } else if (current) {
                current.lines.push(text); // Fortsetzungszeile eines mehrzeiligen Bullets
            }
            // hinzugefuegte Nicht-Bullet-Zeile ohne offenen Bullet (z.B. neue Ueberschrift) -> ignorieren
        } else {
            // Kontext- oder entfernte Zeile beendet einen offenen (hinzugefuegten) Bullet.
            finish();
        }
    }
    finish();

    // Datei-Reihenfolge ist neueste-zuerst; fuer den Kanal chronologisch (aelteste zuerst) drehen.
    return bullets.reverse();
}

function truncate(s, max) {
    if (s.length <= max) return s;
    return s.slice(0, max - 20).trimEnd() + '\n\n… *(gekuerzt)*';
}

// Ermittelt den Bereich aus dem fuehrenden `**xxx:**`-Praefix des Bullets.
function detectArea(text) {
    const m = text.match(/^\*\*([^*]+?):\*\*/);
    if (!m) return DEFAULT_AREA;
    const prefix = m[1].toLowerCase();
    const hits = Object.keys(AREAS).filter(k => prefix.includes(k));
    // Genau ein bekannter Bereich -> dessen Stil; mehrere (z.B. "music-bot + soundboard-bot") -> neutral.
    return hits.length === 1 ? AREAS[hits[0]] : DEFAULT_AREA;
}

function bulletToEmbed(bullet) {
    const text = bullet.lines.join('\n').trim();
    const area = detectArea(text);
    const authorName = `${area.emoji} ${area.label}${bullet.date ? ' · ' + bullet.date : ''}`;
    return {
        author: { name: truncate(authorName, MAX_AUTHOR) },
        description: truncate(text, MAX_DESC),
        color: area.color,
    };
}

async function postBatch(embeds) {
    const payload = { username: 'ByteBots Changelog', embeds };
    if (DRY_RUN || !WEBHOOK) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === 429) {
            let wait = 1000;
            try { wait = Math.ceil((await res.json()).retry_after * 1000) || 1000; } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, wait));
            continue; // einmal erneut versuchen
        }
        if (!res.ok) {
            console.error(`post-changelog: Webhook-POST ${res.status} ${res.statusText}`);
        }
        return;
    }
}

async function main() {
    if (!WEBHOOK && !DRY_RUN) {
        console.log('post-changelog: CHANGELOG_WEBHOOK_URL nicht gesetzt -> No-op.');
        return;
    }

    const base = resolveBase();
    const bullets = collectNewBullets(base);
    if (bullets.length === 0) {
        console.log(`post-changelog: keine neuen CHANGELOG.md-Eintraege in ${base.slice(0, 8)}..${AFTER.slice(0, 8)}.`);
        return;
    }
    console.log(`post-changelog: ${bullets.length} neue(r) Eintrag/Eintraege${DRY_RUN ? ' (dry-run)' : ''}.`);

    const embeds = bullets.map(bulletToEmbed);
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS) {
        await postBatch(embeds.slice(i, i + MAX_EMBEDS));
    }
}

main().catch(e => {
    // Eine Ankuendigung darf den Deploy nie brechen -> Fehler loggen, aber Exit 0.
    console.error('post-changelog: unerwarteter Fehler:', e?.stack || e);
});

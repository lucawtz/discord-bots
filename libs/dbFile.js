const fs = require('fs');
const path = require('path');

/**
 * Schreibt einen Buffer atomar: erst nach <datei>.tmp, dann rename.
 * Ein Crash mitten im Schreiben laesst die alte Datei intakt —
 * wichtig, weil sql.js die komplette DB bei jedem Save neu schreibt.
 * @param {string} filePath - Zielpfad
 * @param {Buffer} buffer - Dateiinhalt
 */
function writeAtomic(filePath, buffer) {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);
}

/**
 * Legt einmal pro Tag eine Kopie der Datei unter <ordner>/backups/ ab
 * (z.B. music-2026-07-12.db) und behaelt die neuesten `keep` Kopien.
 * Beim ersten Save des Tages faellt also automatisch ein Backup an.
 * @param {string} filePath - Pfad zur DB-Datei
 * @param {number} keep - Anzahl der Backups, die behalten werden
 */
function backupDaily(filePath, keep = 7) {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(path.dirname(filePath), 'backups');
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const backupPath = path.join(dir, `${base}-${date}${ext}`);
    if (fs.existsSync(backupPath)) return;

    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(filePath, backupPath);

    const backups = fs.readdirSync(dir)
        .filter(f => f.startsWith(base + '-') && f.endsWith(ext))
        .sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
        fs.unlinkSync(path.join(dir, old));
    }
}

module.exports = { writeAtomic, backupDaily };

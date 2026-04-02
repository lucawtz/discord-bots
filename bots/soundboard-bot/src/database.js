const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'soundboard.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      category TEXT DEFAULT 'Allgemein',
      uploaded_by TEXT,
      is_predefined INTEGER DEFAULT 0,
      data BLOB,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      sound_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, sound_id),
      FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      volume INTEGER DEFAULT 100
    )
  `);

  // Migration: data-Spalte hinzufuegen falls sie fehlt
  try {
    db.run(`ALTER TABLE sounds ADD COLUMN data BLOB`);
  } catch {
    // Spalte existiert bereits
  }

  // Migration: bestehende Dateien aus sounds/ in die DB verschieben
  migrateFilesToDb();

  save();
  return module.exports;
}

function migrateFilesToDb() {
  const soundsDir = path.join(__dirname, '..', 'sounds');
  const stmt = db.prepare(`SELECT id, filename FROM sounds WHERE data IS NULL`);
  const toMigrate = [];
  while (stmt.step()) {
    toMigrate.push(stmt.getAsObject());
  }
  stmt.free();

  for (const sound of toMigrate) {
    const filePath = path.join(soundsDir, sound.filename);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      db.run(`UPDATE sounds SET data = :data WHERE id = :id`, { ':data': fileData, ':id': sound.id });
      console.log(`Migriert: ${sound.filename} -> DB`);
    }
  }

  if (toMigrate.length > 0) {
    save();
    console.log(`${toMigrate.length} Sound(s) in die Datenbank migriert.`);
  }
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getOne(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function getAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = {}) {
  db.run(sql, params);
  save();
}

module.exports = {
  init,
  save,

  addSound({ name, filename, category = 'Allgemein', uploadedBy = null, isPredefined = 0, data = null }) {
    run(
      `INSERT INTO sounds (name, filename, category, uploaded_by, is_predefined, data) VALUES (:name, :filename, :category, :uploadedBy, :isPredefined, :data)`,
      { ':name': name, ':filename': filename, ':category': category, ':uploadedBy': uploadedBy, ':isPredefined': isPredefined ? 1 : 0, ':data': data }
    );
    return db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
  },

  updateSound(id, { name, category, isPredefined }) {
    run(
      `UPDATE sounds SET name = :name, category = :category, is_predefined = :isPredefined WHERE id = :id`,
      { ':id': id, ':name': name, ':category': category, ':isPredefined': isPredefined ? 1 : 0 }
    );
  },

  deleteSound(id) {
    run(`DELETE FROM favorites WHERE sound_id = :id`, { ':id': id });
    run(`DELETE FROM sounds WHERE id = :id`, { ':id': id });
  },

  getSound(id) {
    return getOne(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE id = :id`, { ':id': id });
  },

  getSoundData(id) {
    const row = getOne(`SELECT data FROM sounds WHERE id = :id`, { ':id': id });
    return row?.data ? Buffer.from(row.data) : null;
  },

  getSoundByName(name) {
    return getOne(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE name = :name COLLATE NOCASE`, { ':name': name });
  },

  getPredefinedSounds() {
    return getAll(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE is_predefined = 1 ORDER BY category, name`);
  },

  getUserSounds(userId) {
    return getAll(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE uploaded_by = :userId ORDER BY category, name`, { ':userId': userId });
  },

  getSoundsByCategory(category) {
    return getAll(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE category = :category ORDER BY name`, { ':category': category });
  },

  getAllCategories() {
    return getAll(`SELECT DISTINCT category FROM sounds ORDER BY category`).map(r => r.category);
  },

  searchSounds(query) {
    return getAll(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds WHERE name LIKE :query ORDER BY name LIMIT 25`, { ':query': `%${query}%` });
  },

  addFavorite(userId, soundId) {
    run(`INSERT OR IGNORE INTO favorites (user_id, sound_id) VALUES (:userId, :soundId)`, { ':userId': userId, ':soundId': soundId });
  },

  removeFavorite(userId, soundId) {
    run(`DELETE FROM favorites WHERE user_id = :userId AND sound_id = :soundId`, { ':userId': userId, ':soundId': soundId });
  },

  getFavorites(userId) {
    return getAll(
      `SELECT s.id, s.name, s.filename, s.category, s.uploaded_by, s.is_predefined, s.created_at FROM sounds s JOIN favorites f ON f.sound_id = s.id WHERE f.user_id = :userId ORDER BY s.name`,
      { ':userId': userId }
    );
  },

  isFavorite(userId, soundId) {
    return !!getOne(`SELECT 1 FROM favorites WHERE user_id = :userId AND sound_id = :soundId`, { ':userId': userId, ':soundId': soundId });
  },

  getVolume(userId) {
    const row = getOne(`SELECT volume FROM user_settings WHERE user_id = :userId`, { ':userId': userId });
    return row ? row.volume : 100;
  },

  setVolume(userId, volume) {
    run(
      `INSERT INTO user_settings (user_id, volume) VALUES (:userId, :volume) ON CONFLICT(user_id) DO UPDATE SET volume = :volume`,
      { ':userId': userId, ':volume': Math.max(0, Math.min(200, volume)) }
    );
  },

  getAllSounds() {
    return getAll(`SELECT id, name, filename, category, uploaded_by, is_predefined, created_at FROM sounds ORDER BY category, name`);
  },

  getSoundCount() {
    return getOne(`SELECT COUNT(*) as count FROM sounds`).count;
  },

  getUserSoundCount(userId) {
    return getOne(`SELECT COUNT(*) as count FROM sounds WHERE uploaded_by = :userId`, { ':userId': userId }).count;
  },
};

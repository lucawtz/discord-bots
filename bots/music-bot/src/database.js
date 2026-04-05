const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'music.db');
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
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(guild_id, user_id, name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      duration TEXT,
      thumbnail TEXT,
      artist TEXT,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      auto_dj INTEGER DEFAULT 0,
      default_volume INTEGER DEFAULT 100
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_playlists_guild ON playlists(guild_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position)`);

  save();
  return module.exports;
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

// ── Playlist-Methoden ────────────────────────────────────────────

function createPlaylist(guildId, userId, name, tracks) {
  db.run(
    `INSERT INTO playlists (guild_id, user_id, name) VALUES (:guildId, :userId, :name)`,
    { ':guildId': guildId, ':userId': userId, ':name': name }
  );
  const playlistId = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    db.run(
      `INSERT INTO playlist_tracks (playlist_id, position, title, url, duration, thumbnail, artist)
       VALUES (:pid, :pos, :title, :url, :dur, :thumb, :artist)`,
      {
        ':pid': playlistId,
        ':pos': i,
        ':title': t.title,
        ':url': t.url,
        ':dur': t.duration || null,
        ':thumb': t.thumbnail || null,
        ':artist': t.artist || null,
      }
    );
  }

  save();
  return playlistId;
}

function deletePlaylist(id, userId) {
  const playlist = getOne(`SELECT id, user_id FROM playlists WHERE id = :id`, { ':id': id });
  if (!playlist) return false;
  if (userId && playlist.user_id !== userId && playlist.user_id !== 'dashboard') return false;

  db.run(`DELETE FROM playlist_tracks WHERE playlist_id = :id`, { ':id': id });
  db.run(`DELETE FROM playlists WHERE id = :id`, { ':id': id });
  save();
  return true;
}

function getPlaylist(id) {
  const playlist = getOne(
    `SELECT id, guild_id, user_id, name, created_at FROM playlists WHERE id = :id`,
    { ':id': id }
  );
  if (!playlist) return null;

  const tracks = getAll(
    `SELECT title, url, duration, thumbnail, artist FROM playlist_tracks WHERE playlist_id = :id ORDER BY position`,
    { ':id': id }
  );

  return { ...playlist, tracks };
}

function getPlaylists(guildId, userId) {
  const sql = userId
    ? `SELECT p.id, p.name, p.user_id, p.created_at, COUNT(pt.id) as track_count
       FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.guild_id = :guildId AND (p.user_id = :userId OR p.user_id = 'dashboard')
       GROUP BY p.id ORDER BY p.created_at DESC`
    : `SELECT p.id, p.name, p.user_id, p.created_at, COUNT(pt.id) as track_count
       FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.guild_id = :guildId
       GROUP BY p.id ORDER BY p.created_at DESC`;

  const params = userId
    ? { ':guildId': guildId, ':userId': userId }
    : { ':guildId': guildId };

  return getAll(sql, params);
}

function getPlaylistByName(guildId, userId, name) {
  return getOne(
    `SELECT id, name, user_id, created_at FROM playlists
     WHERE guild_id = :guildId AND user_id = :userId AND name = :name COLLATE NOCASE`,
    { ':guildId': guildId, ':userId': userId, ':name': name }
  );
}

function searchPlaylists(guildId, userId, query) {
  return getAll(
    `SELECT p.id, p.name, p.user_id, COUNT(pt.id) as track_count
     FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     WHERE p.guild_id = :guildId AND (p.user_id = :userId OR p.user_id = 'dashboard')
       AND p.name LIKE :query COLLATE NOCASE
     GROUP BY p.id ORDER BY p.name LIMIT 25`,
    { ':guildId': guildId, ':userId': userId, ':query': `%${query}%` }
  );
}

// ── Guild Settings ───────────────────────────────────────────────

function getGuildSettings(guildId) {
  const row = getOne(`SELECT * FROM guild_settings WHERE guild_id = :guildId`, { ':guildId': guildId });
  return row || { guild_id: guildId, auto_dj: 0, default_volume: 100 };
}

function setGuildSetting(guildId, key, value) {
  const allowed = ['auto_dj', 'default_volume'];
  if (!allowed.includes(key)) return;

  run(
    `INSERT INTO guild_settings (guild_id, ${key}) VALUES (:guildId, :val)
     ON CONFLICT(guild_id) DO UPDATE SET ${key} = :val`,
    { ':guildId': guildId, ':val': value }
  );
}

module.exports = {
  init,
  save,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  getPlaylists,
  getPlaylistByName,
  searchPlaylists,
  getGuildSettings,
  setGuildSetting,
};

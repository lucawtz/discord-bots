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
      default_volume INTEGER DEFAULT 100,
      dj_role_id TEXT DEFAULT NULL
    )
  `);

  // ── Listening History ──────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS listening_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      track_title TEXT,
      track_url TEXT,
      artist TEXT,
      thumbnail TEXT,
      duration TEXT,
      played_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Liked Tracks ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS liked_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      track_title TEXT,
      track_url TEXT,
      artist TEXT,
      thumbnail TEXT,
      duration TEXT,
      liked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, track_url)
    )
  `);

  // ── Followed Artists ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS followed_artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      artist_name TEXT,
      artist_id TEXT,
      artist_image TEXT,
      followed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, artist_id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_playlists_guild ON playlists(guild_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(user_id, guild_id, played_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_likes_user ON liked_tracks(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_followed_user ON followed_artists(user_id)`);

  // ── Migrations ──────────────────────────────────────────────────
  try {
    db.run(`ALTER TABLE guild_settings ADD COLUMN dj_role_id TEXT DEFAULT NULL`);
  } catch (_) { /* column already exists */ }

  db.run("PRAGMA foreign_keys = ON");

  save();
  return module.exports;
}

let _saveTimer = null;
function save() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.error('DB save error:', err.message);
    }
  }, 1000);
}

function saveNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
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
  return row || { guild_id: guildId, auto_dj: 0, default_volume: 100, dj_role_id: null };
}

function setGuildSetting(guildId, key, value) {
  const allowedColumns = { auto_dj: 'auto_dj', default_volume: 'default_volume', dj_role_id: 'dj_role_id' };
  const column = allowedColumns[key];
  if (!column) return;

  run(
    `INSERT INTO guild_settings (guild_id, ${column}) VALUES (:guildId, :val)
     ON CONFLICT(guild_id) DO UPDATE SET ${column} = :val`,
    { ':guildId': guildId, ':val': value }
  );
}

// ── Listening History ────────────────────────────────────────────

function addToHistory(userId, guildId, track) {
  run(
    `INSERT INTO listening_history (user_id, guild_id, track_title, track_url, artist, thumbnail, duration)
     VALUES (:uid, :gid, :title, :url, :artist, :thumb, :dur)`,
    {
      ':uid': userId, ':gid': guildId,
      ':title': track.title, ':url': track.url,
      ':artist': track.artist || null,
      ':thumb': track.thumbnail || null,
      ':dur': track.duration || null,
    }
  );
}

function getHistory(userId, guildId, limit = 50) {
  return getAll(
    `SELECT track_title, track_url, artist, thumbnail, duration, played_at
     FROM listening_history
     WHERE user_id = :uid AND guild_id = :gid
     ORDER BY played_at DESC LIMIT :limit`,
    { ':uid': userId, ':gid': guildId, ':limit': limit }
  );
}

function clearHistory(userId, guildId) {
  run(
    `DELETE FROM listening_history WHERE user_id = :uid AND guild_id = :gid`,
    { ':uid': userId, ':gid': guildId }
  );
}

// ── Liked Tracks ────────────────────────────────────────────────

function likeTrack(userId, guildId, track) {
  try {
    run(
      `INSERT OR IGNORE INTO liked_tracks (user_id, guild_id, track_title, track_url, artist, thumbnail, duration)
       VALUES (:uid, :gid, :title, :url, :artist, :thumb, :dur)`,
      {
        ':uid': userId, ':gid': guildId,
        ':title': track.title, ':url': track.url,
        ':artist': track.artist || null,
        ':thumb': track.thumbnail || null,
        ':dur': track.duration || null,
      }
    );
    return true;
  } catch { return false; }
}

function unlikeTrack(userId, trackUrl) {
  run(
    `DELETE FROM liked_tracks WHERE user_id = :uid AND track_url = :url`,
    { ':uid': userId, ':url': trackUrl }
  );
}

function isTrackLiked(userId, trackUrl) {
  return !!getOne(
    `SELECT id FROM liked_tracks WHERE user_id = :uid AND track_url = :url`,
    { ':uid': userId, ':url': trackUrl }
  );
}

function getLikedTracks(userId, limit = 200) {
  return getAll(
    `SELECT track_title, track_url, artist, thumbnail, duration, liked_at
     FROM liked_tracks WHERE user_id = :uid
     ORDER BY liked_at DESC LIMIT :limit`,
    { ':uid': userId, ':limit': limit }
  );
}

// ── Followed Artists ────────────────────────────────────────────

function followArtist(userId, artist) {
  try {
    run(
      `INSERT OR IGNORE INTO followed_artists (user_id, artist_name, artist_id, artist_image)
       VALUES (:uid, :name, :aid, :img)`,
      {
        ':uid': userId, ':name': artist.name,
        ':aid': artist.id || artist.name,
        ':img': artist.image || null,
      }
    );
    return true;
  } catch { return false; }
}

function unfollowArtist(userId, artistId) {
  run(
    `DELETE FROM followed_artists WHERE user_id = :uid AND artist_id = :aid`,
    { ':uid': userId, ':aid': artistId }
  );
}

function getFollowedArtists(userId) {
  return getAll(
    `SELECT artist_name, artist_id, artist_image, followed_at
     FROM followed_artists WHERE user_id = :uid
     ORDER BY followed_at DESC`,
    { ':uid': userId }
  );
}

// ── Stats (for recommendations) ─────────────────────────────────

function getTopArtistsFromHistory(userId, guildId, days = 30, limit = 10) {
  return getAll(
    `SELECT artist, COUNT(*) as play_count
     FROM listening_history
     WHERE user_id = :uid AND guild_id = :gid AND artist IS NOT NULL
       AND played_at >= datetime('now', :days)
     GROUP BY artist ORDER BY play_count DESC LIMIT :limit`,
    { ':uid': userId, ':gid': guildId, ':days': `-${days} days`, ':limit': limit }
  );
}

function getMostPlayedInGuild(guildId, days = 30, limit = 20) {
  return getAll(
    `SELECT track_title, track_url, artist, thumbnail, duration, COUNT(*) as play_count
     FROM listening_history
     WHERE guild_id = :gid AND played_at >= datetime('now', :days)
     GROUP BY track_url ORDER BY play_count DESC LIMIT :limit`,
    { ':gid': guildId, ':days': `-${days} days`, ':limit': limit }
  );
}

module.exports = {
  init,
  save,
  saveNow,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  getPlaylists,
  getPlaylistByName,
  searchPlaylists,
  getGuildSettings,
  setGuildSetting,
  // History
  addToHistory,
  getHistory,
  clearHistory,
  // Likes
  likeTrack,
  unlikeTrack,
  isTrackLiked,
  getLikedTracks,
  // Following
  followArtist,
  unfollowArtist,
  getFollowedArtists,
  // Stats
  getTopArtistsFromHistory,
  getMostPlayedInGuild,
};

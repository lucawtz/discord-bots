const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const db = require('../database');
const { getDuration, MAX_DURATION } = require('../utils/audio');

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CATEGORIES = [
  'Allgemein',
  'Memes',
  'Musik',
  'Soundeffekte',
  'Sprache',
  'Tiere',
  'Spiele',
  'Filme & Serien',
  'Alerts',
  'Ambient',
];

// Multer: temp-Verzeichnis fuer Uploads (wird nach Verarbeitung geloescht)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Ungueltiges Format! Erlaubt: ' + ALLOWED_EXTENSIONS.join(', ')));
    }
    cb(null, true);
  },
});

// HTTPS GET als Promise
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// URL als Buffer herunterladen
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadToBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function startWebServer(port) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // --- API: Health-Check ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), sounds: db.getSoundCount() });
  });

  // --- API: Sounds auflisten ---
  app.get('/api/sounds', (req, res) => {
    const { type, category, search } = req.query;
    if (search) return res.json(db.searchSounds(search));
    if (category) return res.json(db.getSoundsByCategory(category));
    if (type === 'predefined') return res.json(db.getPredefinedSounds());
    res.json(db.getAllSounds());
  });

  // --- API: Kategorien ---
  app.get('/api/categories', (req, res) => {
    res.json(CATEGORIES);
  });

  // --- API: Sound-Anzahl ---
  app.get('/api/sounds/count', (req, res) => {
    res.json({ count: db.getSoundCount() });
  });

  // --- API: Einzelner Sound ---
  app.get('/api/sounds/:id', (req, res) => {
    const sound = db.getSound(parseInt(req.params.id));
    if (!sound) return res.status(404).json({ error: 'Sound nicht gefunden' });
    res.json(sound);
  });

  // --- API: Sound-Audio streamen (aus DB) ---
  app.get('/api/sounds/:id/audio', (req, res) => {
    const id = parseInt(req.params.id);
    const sound = db.getSound(id);
    if (!sound) return res.status(404).json({ error: 'Sound nicht gefunden' });

    const audioData = db.getSoundData(id);
    if (!audioData) return res.status(404).json({ error: 'Audio-Daten nicht gefunden' });

    const ext = path.extname(sound.filename).toLowerCase();
    const mimeTypes = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webm': 'audio/webm' };
    res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.set('Content-Length', audioData.length);
    res.send(audioData);
  });

  // --- API: Sound bearbeiten ---
  app.put('/api/sounds/:id', (req, res) => {
    const sound = db.getSound(parseInt(req.params.id));
    if (!sound) return res.status(404).json({ error: 'Sound nicht gefunden' });

    const { name, category, predefined } = req.body;

    if (!name || name.length > 32) {
      return res.status(400).json({ error: 'Name ist erforderlich (max. 32 Zeichen)' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Ungueltige Kategorie' });
    }
    const existing = db.getSoundByName(name);
    if (existing && existing.id !== sound.id) {
      return res.status(409).json({ error: `Sound "${name}" existiert bereits` });
    }

    const isPredefined = predefined === true || predefined === 'true';
    db.updateSound(sound.id, { name, category, isPredefined });
    res.json({ id: sound.id, name, category, is_predefined: isPredefined ? 1 : 0 });
  });

  // --- API: Sound loeschen ---
  app.delete('/api/sounds/:id', (req, res) => {
    const sound = db.getSound(parseInt(req.params.id));
    if (!sound) return res.status(404).json({ error: 'Sound nicht gefunden' });
    db.deleteSound(sound.id);
    res.json({ message: 'Sound geloescht' });
  });

  // --- API: Sound hochladen ---
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const { name, category = 'Allgemein', predefined } = req.body;
    const cleanup = () => { try { fs.unlinkSync(req.file.path); } catch {} };

    if (!name || name.length > 32) {
      cleanup();
      return res.status(400).json({ error: 'Name ist erforderlich (max. 32 Zeichen)' });
    }
    if (!CATEGORIES.includes(category)) {
      cleanup();
      return res.status(400).json({ error: 'Ungueltige Kategorie' });
    }
    if (db.getSoundByName(name)) {
      cleanup();
      return res.status(409).json({ error: `Sound "${name}" existiert bereits` });
    }

    try {
      const duration = await getDuration(req.file.path);
      if (duration > MAX_DURATION) {
        cleanup();
        return res.status(400).json({ error: `Sound ist zu lang (${duration.toFixed(1)}s). Maximal ${MAX_DURATION} Sekunden!` });
      }
    } catch {
      cleanup();
      return res.status(400).json({ error: 'Datei konnte nicht gelesen werden. Ist es eine gueltige Audio-Datei?' });
    }

    const audioData = fs.readFileSync(req.file.path);
    cleanup();

    const isPredefined = predefined === 'true';
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}${ext}`;

    const id = db.addSound({
      name,
      filename,
      category: category || 'Allgemein',
      uploadedBy: null,
      isPredefined,
      data: audioData,
    });

    res.status(201).json({ id, name, filename, category: category || 'Allgemein', is_predefined: isPredefined ? 1 : 0 });
  });

  // --- API: Freesound Suche ---
  app.get('/api/freesound/search', async (req, res) => {
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Freesound API-Key nicht konfiguriert' });
    }

    const { q = '', page = 1 } = req.query;
    if (!q.trim()) {
      return res.json({ results: [], count: 0 });
    }

    try {
      const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(q)}&filter=duration:[0 TO ${MAX_DURATION}]&fields=id,name,tags,duration,previews,username,license&page_size=20&page=${page}&token=${apiKey}`;
      const data = JSON.parse(await httpsGet(url));

      const results = (data.results || []).map(s => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        tags: (s.tags || []).slice(0, 5),
        username: s.username,
        license: s.license,
        previewUrl: s.previews?.['preview-hq-mp3'] || s.previews?.['preview-lq-mp3'] || null,
      }));

      res.json({ results, count: data.count || 0, page: parseInt(page) });
    } catch (err) {
      console.error('Freesound-Fehler:', err);
      res.status(500).json({ error: 'Freesound-Suche fehlgeschlagen' });
    }
  });

  // --- API: Freesound Sound als Standard hinzufuegen ---
  app.post('/api/freesound/add', async (req, res) => {
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Freesound API-Key nicht konfiguriert' });
    }

    const { freesoundId, name, category = 'Allgemein', previewUrl } = req.body;

    if (!name || name.length > 32) {
      return res.status(400).json({ error: 'Name ist erforderlich (max. 32 Zeichen)' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Ungueltige Kategorie' });
    }
    if (!previewUrl) {
      return res.status(400).json({ error: 'Keine Preview-URL' });
    }
    if (db.getSoundByName(name)) {
      return res.status(409).json({ error: `Sound "${name}" existiert bereits` });
    }

    try {
      const audioData = await downloadToBuffer(previewUrl);

      // Dauer pruefen (temp file fuer ffmpeg)
      const tmpFile = path.join(os.tmpdir(), `fs_${freesoundId}_${Date.now()}.mp3`);
      fs.writeFileSync(tmpFile, audioData);
      try {
        const duration = await getDuration(tmpFile);
        if (duration > MAX_DURATION) {
          fs.unlinkSync(tmpFile);
          return res.status(400).json({ error: `Sound ist zu lang (${duration.toFixed(1)}s)` });
        }
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }

      const filename = `freesound_${freesoundId}.mp3`;
      const id = db.addSound({
        name,
        filename,
        category: category || 'Allgemein',
        uploadedBy: null,
        isPredefined: true,
        data: audioData,
      });

      res.status(201).json({ id, name, category: category || 'Allgemein' });
    } catch (err) {
      console.error('Freesound-Download-Fehler:', err);
      res.status(500).json({ error: 'Sound konnte nicht heruntergeladen werden' });
    }
  });

  // Multer-Fehler abfangen
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Datei zu gross! Maximal 5 MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Web-Dashboard laeuft auf http://localhost:${port}`);
  });

  return server;
}

module.exports = { startWebServer };

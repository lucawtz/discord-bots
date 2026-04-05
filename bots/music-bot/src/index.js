const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const { spawn, execFileSync } = require('child_process'); // execFileSync für yt-dlp detection


const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { startAPI } = require('./api');
const db = require('./database');

// ── Konstanten ────────────────────────────────────────────────────
const DELETE_SHORT_MS = 30_000;     // 30 Sekunden (skip, pause, stop, join)
const DELETE_EMBED_MS = 60_000;     // 60 Sekunden (play, queue, nowplaying)
const DELETE_ERROR_MS = 10_000;     // 10 Sekunden (Fehler)
const LEAVE_TIMEOUT_MS = 5 * 60_000; // 5 Minuten
const CONNECT_TIMEOUT_MS = 30_000;  // 30 Sekunden
const DISCONNECT_CHECK_MS = 5_000;  // 5 Sekunden

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// ── Queue-Verwaltung ──────────────────────────────────────────────
const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            tracks: [],
            current: null,
            player: null,
            connection: null,
            channel: null,
            processes: new Set(),
            playLock: false,
            stopped: false,
            leaveTimer: null,
            loopMode: 'off',      // off, song, queue
            volume: 1.0,
            filter: 'off',        // off, bassboost, nightcore, slowed
            skipVotes: new Set(),
            autoDj: false,
            _djHistory: new Set(),
            _djConsecutive: 0,
        });
        // Load Auto-DJ setting from DB
        try {
            const settings = db.getGuildSettings(guildId);
            queues.get(guildId).autoDj = !!settings.auto_dj;
        } catch {}
    }
    return queues.get(guildId);
}

function destroyQueue(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);
    if (queue._nowPlayingMsg) queue._nowPlayingMsg.delete().catch(() => {});
    for (const proc of queue.processes) {
        if (!proc.killed) proc.kill();
    }
    queue.processes.clear();
    queue.tracks = [];
    queue.current = null;
    if (queue.player) {
        queue.player.removeAllListeners();
        queue.player.stop(true);
    }
    if (queue.connection) {
        queue.connection.removeAllListeners();
        queue.connection.destroy();
    }
    queues.delete(guildId);
    updateActivity(guildId);
}

// ── yt-dlp ────────────────────────────────────────────────────────
let ytdlpPath;
try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
    ytdlpPath = 'yt-dlp';
} catch {
    const ytdlpBin = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    ytdlpPath = path.join(path.dirname(require.resolve('youtube-dl-exec')), '..', 'bin', ytdlpBin);
}
console.log(`yt-dlp: ${ytdlpPath}`);

// ── FFmpeg ────────────────────────────────────────────────────────
let ffmpegPath;
try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    ffmpegPath = 'ffmpeg';
} catch {
    try {
        ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        // FFmpeg-Ordner zum PATH hinzufuegen, damit @discordjs/voice es findet
        process.env.PATH = path.dirname(ffmpegPath) + path.delimiter + process.env.PATH;
    }
    catch { ffmpegPath = 'ffmpeg'; }
}
console.log(`ffmpeg: ${ffmpegPath}`);

// ── Cookies (optional, für YouTube-Stabilität) ───────────────────
const cookieArgs = [];
const cookiePath = path.join(__dirname, '..', 'cookies.txt');
if (fs.existsSync(cookiePath)) {
    cookieArgs.push('--cookies', cookiePath);
    console.log('yt-dlp: cookies.txt geladen');
} else {
    console.log('yt-dlp: Keine cookies.txt gefunden (optional)');
}

// ── yt-dlp Auto-Update (im Hintergrund, blockiert nicht den Start) ──
spawn(ytdlpPath, ['-U']).on('close', (code) => {
    if (code === 0) console.log('yt-dlp: Update geprüft');
});

// ── Spotify API (Client Credentials) ────────────────────────────
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
let spotifyToken = null;
let spotifyTokenExpires = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < spotifyTokenExpires) return spotifyToken;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Spotify ist nicht konfiguriert (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET fehlen)');
    }
    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    return new Promise((resolve, reject) => {
        const body = 'grant_type=client_credentials';
        const req = https.request('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        spotifyToken = json.access_token;
                        spotifyTokenExpires = Date.now() + (json.expires_in - 60) * 1000;
                        resolve(spotifyToken);
                    } else {
                        reject(new Error('Spotify Token-Fehler'));
                    }
                } catch { reject(new Error('Spotify API: Ungültige Antwort')); }
            });
        });
        req.on('error', reject);
        req.end(body);
    });
}

function spotifyFetch(endpoint) {
    return getSpotifyToken().then(token => new Promise((resolve, reject) => {
        const req = https.get(`https://api.spotify.com/v1${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 8000,
        }, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400) return reject(new Error(json.error?.message || `Spotify ${res.statusCode}`));
                    resolve(json);
                } catch { reject(new Error('Spotify API: Ungültige Antwort')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Spotify API: Timeout')); });
    }));
}

function isSpotifyUrl(url) {
    return url.includes('open.spotify.com/');
}

function parseSpotifyUrl(url) {
    // Unterstützt: open.spotify.com/track/ID, /album/ID, /playlist/ID (mit optionalen Query-Params)
    const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return { type: match[1], id: match[2] };
}

function spotifyTrackToSearch(track) {
    const artists = track.artists?.map(a => a.name).join(', ') || '';
    const albumArt = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null;
    return {
        searchQuery: `${track.name} ${artists}`,
        title: artists ? `${artists} – ${track.name}` : track.name,
        duration: formatDuration(Math.floor((track.duration_ms || 0) / 1000)),
        artist: artists || null,
        albumArt,
    };
}

async function searchSpotifyTrack(url) {
    const parsed = parseSpotifyUrl(url);
    if (!parsed || parsed.type !== 'track') throw new Error('Ungültige Spotify-Track-URL');
    const data = await spotifyFetch(`/tracks/${parsed.id}`);
    const info = spotifyTrackToSearch(data);
    // Auf YouTube suchen
    const ytTrack = await searchTrack(info.searchQuery);
    ytTrack.title = info.title; // Spotify-Titel verwenden (genauer)
    if (info.artist) ytTrack.artist = info.artist;
    if (info.albumArt) ytTrack.albumArt = info.albumArt;
    return ytTrack;
}

async function searchSpotifyPlaylist(url) {
    const parsed = parseSpotifyUrl(url);
    if (!parsed) throw new Error('Ungültige Spotify-URL');

    let title = 'Spotify Playlist';
    let allTracks = [];

    if (parsed.type === 'playlist') {
        const data = await spotifyFetch(`/playlists/${parsed.id}?fields=name,tracks.items(track(name,artists,duration_ms)),tracks.next,tracks.total`);
        title = data.name || title;
        allTracks = (data.tracks?.items || []).filter(i => i.track).map(i => i.track);

        // Weitere Seiten laden (Spotify paginiert bei 100)
        let next = data.tracks?.next;
        while (next) {
            const endpoint = next.replace('https://api.spotify.com/v1', '');
            const page = await spotifyFetch(endpoint);
            allTracks.push(...(page.items || []).filter(i => i.track).map(i => i.track));
            next = page.next;
        }
    } else if (parsed.type === 'album') {
        const data = await spotifyFetch(`/albums/${parsed.id}`);
        title = `${data.artists?.[0]?.name || ''} – ${data.name || 'Album'}`.trim();
        allTracks = data.tracks?.items || [];
        // Album-Tracks haben keine Thumbnail, aber das ist ok — YouTube hat welche
    }

    if (allTracks.length === 0) throw new Error('Leere Spotify-Playlist/Album');

    // Alle Spotify-Tracks parallel auf YouTube suchen (max 5 gleichzeitig)
    const tracks = [];
    const batchSize = 5;
    for (let i = 0; i < allTracks.length; i += batchSize) {
        const batch = allTracks.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(async (t) => {
                const info = spotifyTrackToSearch(t);
                const ytTrack = await searchTrack(info.searchQuery);
                ytTrack.title = info.title;
                if (info.artist) ytTrack.artist = info.artist;
                if (info.albumArt) ytTrack.albumArt = info.albumArt;
                return ytTrack;
            })
        );
        for (const r of results) {
            if (r.status === 'fulfilled') tracks.push(r.value);
        }
    }

    if (tracks.length === 0) throw new Error('Konnte keine Songs von Spotify auf YouTube finden');
    console.log(`Spotify: ${tracks.length}/${allTracks.length} Songs gefunden für "${title}"`);
    return { title, tracks };
}

// ── Apple Music (öffentliche API, keine Auth nötig) ─────────────
function isAppleMusicUrl(url) {
    return url.includes('music.apple.com/');
}

function parseAppleMusicUrl(url) {
    // Unterstützt: music.apple.com/{storefront}/album/{name}/{id}?i={trackId}
    //              music.apple.com/{storefront}/album/{name}/{id}
    //              music.apple.com/{storefront}/playlist/{name}/{id}
    const trackMatch = url.match(/music\.apple\.com\/([a-z]{2})\/album\/[^/]+\/(\d+)\?i=(\d+)/);
    if (trackMatch) return { type: 'track', storefront: trackMatch[1], albumId: trackMatch[2], trackId: trackMatch[3] };

    const albumMatch = url.match(/music\.apple\.com\/([a-z]{2})\/album\/[^/]+\/(\d+)/);
    if (albumMatch) return { type: 'album', storefront: albumMatch[1], id: albumMatch[2] };

    const playlistMatch = url.match(/music\.apple\.com\/([a-z]{2})\/playlist\/[^/]+\/(pl\.[a-zA-Z0-9]+)/);
    if (playlistMatch) return { type: 'playlist', storefront: playlistMatch[1], id: playlistMatch[2] };

    return null;
}

function appleMusicFetch(endpoint) {
    return new Promise((resolve, reject) => {
        const req = https.get(`https://api.music.apple.com/v1${endpoint}`, {
            headers: {
                'Origin': 'https://music.apple.com',
            },
            timeout: 8000,
        }, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400) return reject(new Error(json.errors?.[0]?.title || `Apple Music ${res.statusCode}`));
                    resolve(json);
                } catch { reject(new Error('Apple Music API: Ungültige Antwort')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Apple Music API: Timeout')); });
    });
}

function appleMusicTrackToSearch(track) {
    const attrs = track.attributes || {};
    const artists = attrs.artistName || '';
    const albumArt = attrs.artwork?.url?.replace('{w}', '300').replace('{h}', '300') || null;
    return {
        searchQuery: `${attrs.name} ${artists}`,
        title: artists ? `${artists} – ${attrs.name}` : attrs.name,
        duration: formatDuration(Math.floor((attrs.durationInMillis || 0) / 1000)),
        artist: artists || null,
        albumArt,
    };
}

async function searchAppleMusicTrack(url) {
    const parsed = parseAppleMusicUrl(url);
    if (!parsed || parsed.type !== 'track') throw new Error('Ungültige Apple Music Track-URL');
    const data = await appleMusicFetch(`/catalog/${parsed.storefront}/songs/${parsed.trackId}`);
    const track = data.data?.[0];
    if (!track) throw new Error('Apple Music Track nicht gefunden');
    const info = appleMusicTrackToSearch(track);
    const ytTrack = await searchTrack(info.searchQuery);
    ytTrack.title = info.title;
    if (info.artist) ytTrack.artist = info.artist;
    if (info.albumArt) ytTrack.albumArt = info.albumArt;
    return ytTrack;
}

async function searchAppleMusicPlaylist(url) {
    const parsed = parseAppleMusicUrl(url);
    if (!parsed) throw new Error('Ungültige Apple Music URL');

    let title = 'Apple Music Playlist';
    let allTracks = [];

    if (parsed.type === 'album') {
        const data = await appleMusicFetch(`/catalog/${parsed.storefront}/albums/${parsed.id}`);
        const album = data.data?.[0];
        if (!album) throw new Error('Apple Music Album nicht gefunden');
        const attrs = album.attributes || {};
        title = `${attrs.artistName || ''} – ${attrs.name || 'Album'}`.trim();
        allTracks = album.relationships?.tracks?.data || [];
    } else if (parsed.type === 'playlist') {
        const data = await appleMusicFetch(`/catalog/${parsed.storefront}/playlists/${parsed.id}`);
        const playlist = data.data?.[0];
        if (!playlist) throw new Error('Apple Music Playlist nicht gefunden');
        title = playlist.attributes?.name || title;
        allTracks = playlist.relationships?.tracks?.data || [];
    }

    if (allTracks.length === 0) throw new Error('Leere Apple Music Playlist/Album');

    const tracks = [];
    const batchSize = 5;
    for (let i = 0; i < allTracks.length; i += batchSize) {
        const batch = allTracks.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(async (t) => {
                const info = appleMusicTrackToSearch(t);
                const ytTrack = await searchTrack(info.searchQuery);
                ytTrack.title = info.title;
                if (info.artist) ytTrack.artist = info.artist;
                if (info.albumArt) ytTrack.albumArt = info.albumArt;
                return ytTrack;
            })
        );
        for (const r of results) {
            if (r.status === 'fulfilled') tracks.push(r.value);
        }
    }

    if (tracks.length === 0) throw new Error('Konnte keine Songs von Apple Music auf YouTube finden');
    console.log(`Apple Music: ${tracks.length}/${allTracks.length} Songs gefunden für "${title}"`);
    return { title, tracks };
}

// ── Piped API (schnelle Suche mit Instance-Rotation) ────────────
const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegfau.lt',
];
let pipedInstanceIndex = 0;

function pipedFetchSingle(instance, endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${instance}${endpoint}`;
        const req = https.get(url, { timeout: 4000 }, (res) => {
            if (res.statusCode >= 400) {
                res.resume();
                return reject(new Error(`Piped ${res.statusCode}`));
            }
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error('Piped API: Ungültige Antwort')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Piped API: Timeout')); });
    });
}

async function pipedFetch(endpoint) {
    // Alle Instanzen durchprobieren, beginnend bei der zuletzt erfolgreichen
    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
        const idx = (pipedInstanceIndex + i) % PIPED_INSTANCES.length;
        try {
            const result = await pipedFetchSingle(PIPED_INSTANCES[idx], endpoint);
            pipedInstanceIndex = idx; // Erfolgreiche Instanz merken
            return result;
        } catch (err) {
            console.log(`Piped ${PIPED_INSTANCES[idx]} fehlgeschlagen: ${err.message}`);
            if (i === PIPED_INSTANCES.length - 1) throw err; // Alle fehlgeschlagen
        }
    }
}

async function pipedSearch(query, limit = 5) {
    const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    const items = (data.items || []).filter(i => i.url && i.type === 'stream').slice(0, limit);
    if (items.length === 0) {
        // Fallback: ohne Filter suchen
        const data2 = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=videos`);
        const items2 = (data2.items || []).filter(i => i.url && i.type === 'stream').slice(0, limit);
        if (items2.length === 0) throw new Error('Keine Ergebnisse');
        return items2;
    }
    return items;
}

function pipedToTrack(item) {
    return {
        title: item.title || 'Unbekannter Titel',
        url: `https://www.youtube.com${item.url}`,
        duration: formatDuration(item.duration),
        durationSec: item.duration || 0,
        thumbnail: item.thumbnail || null,
        artist: item.uploaderName || item.uploader || null,
    };
}

// ── Suche: Piped API mit yt-dlp Fallback ─────────────────────────
async function searchTrack(query) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');

    // Spotify-Track-URL erkennen
    if (isUrl && isSpotifyUrl(query)) {
        return searchSpotifyTrack(query);
    }

    // Apple Music Track-URL erkennen
    if (isUrl && isAppleMusicUrl(query)) {
        return searchAppleMusicTrack(query);
    }

    // URLs direkt über yt-dlp auflösen
    if (isUrl) return searchTrackYtdlp(query);

    // Piped API für Textsuche
    try {
        const items = await pipedSearch(query, 1);
        return pipedToTrack(items[0]);
    } catch (err) {
        console.log('Piped-Suche fehlgeschlagen, Fallback auf yt-dlp:', err.message);
        return searchTrackYtdlp(`ytsearch1:${query}`);
    }
}

async function searchTracks(query, limit = 5) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        const track = await searchTrack(query);
        return [track];
    }

    // Piped API für Textsuche
    try {
        const items = await pipedSearch(query, limit);
        return items.map(pipedToTrack);
    } catch (err) {
        console.log('Piped-Suche fehlgeschlagen, Fallback auf yt-dlp:', err.message);
        return searchTracksYtdlp(query, limit);
    }
}

// ── Enhanced Search (kategorisiert + Spotify-Metadaten) ─────────

async function searchEnhanced(query) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        const track = await searchTrack(query);
        return { tracks: [track], artists: [], albums: [] };
    }

    // Parallel: YouTube/Piped tracks + Spotify search (artist, tracks, albums)
    const [ytTracks, spotifyResult] = await Promise.allSettled([
        searchTracks(query, 10),
        searchSpotifyEnhanced(query),
    ]);

    const tracks = ytTracks.status === 'fulfilled' ? ytTracks.value : [];
    const spotify = spotifyResult.status === 'fulfilled' ? spotifyResult.value : { artists: [], albums: [], tracks: [] };

    // Merge: enrich YouTube tracks with Spotify artist data
    const enrichedTracks = tracks.map(t => {
        // Try matching with Spotify track for better metadata
        const spMatch = spotify.tracks.find(st =>
            normalizeForMatch(st.name).includes(normalizeForMatch(t.title)) ||
            normalizeForMatch(t.title).includes(normalizeForMatch(st.name))
        );
        if (spMatch && !t.artist) {
            t.artist = spMatch.artists?.map(a => a.name).join(', ') || t.artist;
        }
        return t;
    });

    // Score and sort tracks by relevance
    const queryLower = normalizeForMatch(query);
    const scoredTracks = enrichedTracks.map(t => {
        let score = 0;
        const titleLower = normalizeForMatch(t.title);
        const artistLower = normalizeForMatch(t.artist || '');
        // Exact title match
        if (titleLower === queryLower) score += 100;
        // Title contains query
        else if (titleLower.includes(queryLower)) score += 50;
        // Query words in title
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
        const matchedWords = queryWords.filter(w => titleLower.includes(w) || artistLower.includes(w));
        score += (matchedWords.length / Math.max(queryWords.length, 1)) * 40;
        // Artist match bonus
        if (artistLower && queryLower.includes(artistLower)) score += 30;
        return { ...t, _score: score };
    });

    scoredTracks.sort((a, b) => b._score - a._score);

    // Filter artists: only include if name is reasonably related to query
    const relevantArtists = spotify.artists.filter(a => {
        const nameNorm = normalizeForMatch(a.name);
        return queryLower.includes(nameNorm) || nameNorm.includes(queryLower) ||
            fuzzyMatch(queryLower, nameNorm) > 0.5;
    });

    return {
        tracks: scoredTracks.map(({ _score, ...t }) => t),
        artists: relevantArtists.map(a => ({
            id: a.id,
            name: a.name,
            image: a.images?.[1]?.url || a.images?.[0]?.url || null,
            genres: a.genres?.slice(0, 3) || [],
            followers: a.followers?.total || 0,
        })),
        albums: spotify.albums.map(a => ({
            id: a.id,
            name: a.name,
            artist: a.artists?.map(ar => ar.name).join(', ') || '',
            image: a.images?.[1]?.url || a.images?.[0]?.url || null,
            releaseDate: a.release_date || null,
            totalTracks: a.total_tracks || 0,
        })),
    };
}

async function searchSpotifyEnhanced(query) {
    try {
        const data = await spotifyFetch(
            `/search?q=${encodeURIComponent(query)}&type=artist,track,album&limit=5&market=DE`
        );
        return {
            artists: data.artists?.items || [],
            tracks: data.tracks?.items || [],
            albums: data.albums?.items || [],
        };
    } catch {
        return { artists: [], tracks: [], albums: [] };
    }
}

function normalizeForMatch(str) {
    return (str || '').toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function fuzzyMatch(a, b) {
    if (!a || !b) return 0;
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    let matches = 0;
    for (const aw of aWords) {
        if (bWords.some(bw => bw.includes(aw) || aw.includes(bw))) matches++;
    }
    return matches / Math.max(aWords.length, 1);
}

// ── yt-dlp Fallback-Suche ────────────────────────────────────────
function searchTrackYtdlp(searchQuery) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, '--js-runtimes', 'node', searchQuery,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const info = data.entries ? data.entries[0] : data;
                if (!info) return reject(new Error('Kein Ergebnis gefunden'));
                resolve({
                    title: info.title || 'Unbekannter Titel',
                    url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                    duration: formatDuration(info.duration),
                    durationSec: info.duration || 0,
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                    artist: info.artist || info.creator || info.channel || info.uploader || null,
                    album: info.album || null,
                    albumArt: info.thumbnail || info.thumbnails?.find(t => t.width >= 300)?.url || null,
                });
            } catch {
                reject(new Error('Konnte Song-Info nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

function searchTracksYtdlp(query, limit = 5) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, '--js-runtimes', 'node', `ytsearch${limit}:${query}`,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const entries = data.entries || [data];
                resolve(entries.filter(i => i).map(info => ({
                    title: info.title || 'Unbekannter Titel',
                    url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                    duration: formatDuration(info.duration),
                    durationSec: info.duration || 0,
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                    artist: info.artist || info.creator || info.channel || info.uploader || null,
                    album: info.album || null,
                    albumArt: info.thumbnail || info.thumbnails?.find(t => t.width >= 300)?.url || null,
                })));
            } catch {
                reject(new Error('Konnte Suchergebnisse nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

async function searchPlaylist(url) {
    // Spotify-Playlists/Alben über Spotify API + YouTube-Suche
    if (isSpotifyUrl(url)) return searchSpotifyPlaylist(url);

    // Apple Music Playlists/Alben
    if (isAppleMusicUrl(url)) return searchAppleMusicPlaylist(url);

    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--yes-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, '--js-runtimes', 'node', url,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const entries = data.entries || [];
                if (entries.length === 0) return reject(new Error('Leere Playlist'));
                resolve({
                    title: data.title || 'Unbekannte Playlist',
                    tracks: entries.filter(i => i).map(info => ({
                        title: info.title || 'Unbekannter Titel',
                        url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                        duration: formatDuration(info.duration),
                        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                    })),
                });
            } catch {
                reject(new Error('Konnte Playlist nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

function isPlaylistUrl(url) {
    if (isSpotifyUrl(url)) {
        const parsed = parseSpotifyUrl(url);
        return parsed && (parsed.type === 'playlist' || parsed.type === 'album');
    }
    if (isAppleMusicUrl(url)) {
        const parsed = parseAppleMusicUrl(url);
        return parsed && (parsed.type === 'playlist' || parsed.type === 'album');
    }
    return url.includes('list=') || url.includes('/playlist') || url.includes('/album');
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseDuration(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

function getElapsed(queue) {
    if (!queue.current || !queue._playbackStart) return 0;
    const isPaused = queue.player?.state?.status === AudioPlayerStatus.Paused;
    if (isPaused) return queue._pausedElapsed || 0;
    return Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
}

function createProgressBar(elapsed, total, length = 12) {
    const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
    const pos = Math.round(progress * length);
    const bar = '▬'.repeat(Math.max(pos - 1, 0)) + '🔘' + '▬'.repeat(length - pos);
    return `${formatDuration(elapsed)} ${bar} ${formatDuration(total)}`;
}

function updateActivity(guildId) {
    const queue = queues.get(guildId);
    if (queue?.current) {
        client.user.setActivity(queue.current.title, { type: ActivityType.Listening });
    } else {
        const activeQueues = [...queues.values()].filter(q => q.current);
        if (activeQueues.length === 0) {
            client.user.setActivity('/play', { type: ActivityType.Listening });
        }
    }
}

// ── Audio-Filter für FFmpeg ──────────────────────────────────────
const AUDIO_FILTERS = {
    off: [],
    bassboost: ['-af', 'bass=g=8,acompressor=threshold=-20dB:ratio=4'],
    nightcore: ['-af', 'aresample=48000,asetrate=48000*1.25'],
    slowed: ['-af', 'aresample=48000,asetrate=48000*0.85'],
};

// ── Audio-Stream (yt-dlp → FFmpeg → OggOpus) ────────────────────
function createStream(url, queue, onError, seekSeconds = 0) {
    const ytdlp = spawn(ytdlpPath, [
        '-f', 'bestaudio/bestaudio*/best',
        '-o', '-', '--no-check-certificates', '--no-warnings',
        '--force-ipv4', '--retries', '3', '--extractor-retries', '3',
        ...cookieArgs, '--js-runtimes', 'node', url,
    ]);

    const filterArgs = AUDIO_FILTERS[queue.filter] || [];

    const ffmpeg = spawn(ffmpegPath, [
        ...(seekSeconds > 0 ? ['-ss', String(seekSeconds)] : []),
        '-i', 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', 'error',
        ...filterArgs,
        '-f', 'ogg',
        '-acodec', 'libopus',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ]);

    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdin.on('error', () => {}); // Broken pipe ignorieren

    let hasData = false;
    let stderrOutput = '';
    ffmpeg.stdout.on('data', () => { hasData = true; });

    ytdlp.stderr.on('data', (d) => { stderrOutput += d.toString(); });
    ytdlp.on('close', (code) => {
        queue.processes.delete(ytdlp);
        if (stderrOutput.trim()) console.error('yt-dlp stderr:', stderrOutput.trim());
        if (code !== 0 && !hasData) {
            ffmpeg.kill();
            const lastLine = stderrOutput.trim().split('\n').pop();
            onError?.(new Error(lastLine || `yt-dlp Fehler (Code ${code})`));
        }
    });

    ffmpeg.stderr.on('data', (d) => console.error('ffmpeg stderr:', d.toString().trim()));
    ffmpeg.on('close', () => { queue.processes.delete(ffmpeg); });

    ytdlp.on('error', (e) => { console.error('yt-dlp spawn error:', e.message); onError?.(e); });
    ffmpeg.on('error', (e) => { console.error('ffmpeg spawn error:', e.message); onError?.(e); });

    queue.processes.add(ytdlp);
    queue.processes.add(ffmpeg);
    return ffmpeg.stdout;
}

// ── Voice-Verbindung aufbauen (gemeinsame Logik) ─────────────────
async function setupVoiceConnection(guildId, voiceChannel, guild, textChannel) {
    const queue = getQueue(guildId);

    // Bestehende Timer abbrechen
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);
    queue.leaveTimer = null;
    queue.stopped = false;

    if (queue.connection && queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return queue;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queue.connection = connection;
    queue.player = player;
    if (textChannel) queue.channel = textChannel;

    // Player Events
    player.on(AudioPlayerStatus.Idle, () => {
        setTimeout(() => playNext(guildId), 200);
    });

    player.on('error', (error) => {
        console.error('Player error:', error.message);
        autoDelete(queue.channel?.send(`❌ Wiedergabefehler: ${error.message}`), DELETE_ERROR_MS);
        playNext(guildId);
    });

    player.on('stateChange', (oldState, newState) => {
        if (oldState.status !== newState.status) {
            ctx.broadcast('stateUpdate', ctx.getGuildState(guildId));
        }
    });

    // Disconnect-Handling mit Reconnect-Versuch
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                new Promise(resolve => {
                    const check = (_, newState) => {
                        if (newState.status === VoiceConnectionStatus.Ready || newState.status === VoiceConnectionStatus.Signalling) {
                            connection.removeListener('stateChange', check);
                            resolve();
                        }
                    };
                    connection.on('stateChange', check);
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Reconnect timeout')), DISCONNECT_CHECK_MS)),
            ]);
        } catch {
            if (queue.connection && queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                destroyQueue(guildId);
            }
        }
    });

    // Warten bis Connection ready
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                connection.removeAllListeners('stateChange');
                reject(new Error('Voice-Verbindung konnte nicht hergestellt werden'));
            }, CONNECT_TIMEOUT_MS);

            const onStateChange = (_, newState) => {
                if (newState.status === VoiceConnectionStatus.Ready) {
                    clearTimeout(timeout);
                    connection.removeListener('stateChange', onStateChange);
                    resolve();
                }
            };
            connection.on('stateChange', onStateChange);
        });
    }

    return queue;
}

// ── Voice-Verbindung herstellen (via Slash-Command) ──────────────
async function ensureConnection(interaction, ctx) {
    const channel = interaction.member.voice.channel;
    if (!channel) throw new Error('Du bist in keinem Voice Channel!');
    return setupVoiceConnection(interaction.guild.id, channel, interaction.guild, interaction.channel);
}

// ── Leave-Timer starten ───────────────────────────────────────────
function scheduleLeave(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);

    // Kurz vor Leave eine Nachricht senden
    const warningMs = Math.max(LEAVE_TIMEOUT_MS - 5_000, 0);
    queue._leaveWarningTimer = setTimeout(() => {
        const q = queues.get(guildId);
        if (q && !q.current && !q.stopped && q.channel) {
            q.channel.send('👋 Ciao!')
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10_000))
                .catch(() => {});
        }
    }, warningMs);

    queue.leaveTimer = setTimeout(() => {
        const q = queues.get(guildId);
        if (q && !q.current) destroyQueue(guildId);
    }, LEAVE_TIMEOUT_MS);
}

// ── Voice-Channel beitreten (für Web App) ────────────────────────
async function joinChannel(guildId, channelId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Server nicht gefunden');

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) throw new Error('Voice Channel nicht gefunden');

    return setupVoiceConnection(guildId, channel, guild);
}

// ── Player-Buttons erstellen ─────────────────────────────────────
function createPlayerButtons(loopMode) {
    const loopEmoji = loopMode === 'song' ? '🔂' : loopMode === 'queue' ? '🔁' : '➡️';
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_pause').setEmoji('⏯️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_loop').setEmoji(loopEmoji).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    );
}

// ── Wiedergabe ────────────────────────────────────────────────────
// ── Auto-DJ: Aehnlichen Track finden ─────────────────────────────
async function findAutoDjTrack(lastTrack, queue) {
    // Titel bereinigen
    const cleanTitle = lastTrack.title
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[Official.*?\]/gi, '')
        .replace(/\(Lyrics?\)/gi, '')
        .replace(/\[Lyrics?\]/gi, '')
        .replace(/\(Audio\)/gi, '')
        .replace(/\[Audio\]/gi, '')
        .replace(/official\s*(music\s*)?video/gi, '')
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\[feat\..*?\]/gi, '')
        .trim();

    // Artist extrahieren (Text vor " - " oder " – ")
    const artistMatch = cleanTitle.match(/^(.+?)\s*[-–]\s*/);
    const searchQuery = artistMatch
        ? `${artistMatch[1]} mix`
        : `${cleanTitle} similar songs`;

    const results = await searchTracks(searchQuery, 5);

    // Bereits gespielte URLs filtern
    const candidates = results.filter(t => !queue._djHistory.has(t.url));

    // Aus Top 3 zufaellig waehlen
    const pool = candidates.length > 0 ? candidates.slice(0, 3) : results.slice(0, 3);
    const picked = pool[Math.floor(Math.random() * pool.length)];

    // History aktualisieren (max 50 Eintraege)
    if (lastTrack.url) queue._djHistory.add(lastTrack.url);
    if (queue._djHistory.size > 50) {
        const first = queue._djHistory.values().next().value;
        queue._djHistory.delete(first);
    }

    return picked || null;
}

async function playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.playLock) return;

    queue.playLock = true;
    try {
        // Alte Prozesse beenden
        for (const proc of queue.processes) {
            if (!proc.killed) proc.kill();
        }
        queue.processes.clear();

        // Fehlgeschlagenen Track erneut versuchen (1x Retry)
        const isRetry = !!queue._failedTrack;
        if (queue._failedTrack) {
            queue.tracks.unshift(queue._failedTrack);
            queue._failedTrack = null;
        }

        // Loop nur wenn kein Retry (sonst doppelte Tracks)
        if (!isRetry && queue.loopMode === 'song' && queue.current) {
            queue.tracks.unshift({ ...queue.current, _retried: false });
        }
        if (!isRetry && queue.loopMode === 'queue' && queue.current) {
            queue.tracks.push({ ...queue.current, _retried: false });
        }

        // Auto-DJ: Queue leer → aehnlichen Track suchen
        if (queue.tracks.length === 0 && queue.autoDj && !queue.stopped && queue.loopMode === 'off') {
            const lastTrack = queue.current;
            if (lastTrack && queue._djConsecutive < 50) {
                try {
                    const djTrack = await findAutoDjTrack(lastTrack, queue);
                    if (djTrack) {
                        djTrack.requestedBy = '\uD83E\uDD16 Auto-DJ';
                        queue.tracks.push(djTrack);
                        queue._djConsecutive++;
                    }
                } catch (err) {
                    console.error('Auto-DJ Fehler:', err.message);
                }
            }
        }

        if (queue.tracks.length === 0) {
            queue.current = null;
            queue.stopped = false;
            updateActivity(guildId);
            scheduleLeave(guildId);
            return;
        }

        // Alte "Now Playing"-Nachricht löschen
        if (queue._nowPlayingMsg) {
            queue._nowPlayingMsg.delete().catch(() => {});
            queue._nowPlayingMsg = null;
        }

        const track = queue.tracks.shift();
        queue.current = track;
        queue.skipVotes.clear();
        queue._playbackStart = Date.now();
        queue._seekOffset = 0;

        // Reset Auto-DJ counter when user manually queued a track
        if (track.requestedBy && track.requestedBy !== '\uD83E\uDD16 Auto-DJ') {
            queue._djConsecutive = 0;
        }

        // Track listening history (use requestedBy userId if available, fallback to guild)
        try {
            const historyUserId = track._requestedById || `guild_${guildId}`;
            db.addToHistory(historyUserId, guildId, track);
        } catch { /* non-critical */ }

        const stream = createStream(track.url, queue, (err) => {
            if (!track._retried) {
                track._retried = true;
                queue._failedTrack = track;
                console.error(`Stream-Fehler bei "${track.title}", Retry wird versucht...`);
            } else {
                autoDelete(queue.channel?.send(`❌ Stream-Fehler bei **${track.title}**: ${err.message}`), DELETE_ERROR_MS);
            }
        });
        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        queue._resource = resource;
        queue.player.play(resource);
        updateActivity(guildId);

        // "Now Playing"-Nachricht mit Buttons senden
        if (queue.channel) {
            const row = createPlayerButtons(queue.loopMode);
            const npEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Spielt jetzt', iconURL: client.user.displayAvatarURL() })
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.albumArt || track.thumbnail)
                .addFields(
                    { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                    { name: 'Angefragt von', value: track.requestedBy || '—', inline: true },
                )
                .setColor(0x6E41CC);
            if (track.artist) {
                npEmbed.spliceFields(1, 0, { name: 'Artist', value: track.artist, inline: true });
            }
            if (queue.loopMode !== 'off') {
                npEmbed.setFooter({ text: queue.loopMode === 'song' ? 'Song Loop' : 'Queue Loop' });
            }
            queue.channel.send({ embeds: [npEmbed], components: [row] })
                .then(msg => { queue._nowPlayingMsg = msg; })
                .catch(() => {});
        }
    } catch (error) {
        console.error('Playback error:', error.message);
        queue.current = null;
        autoDelete(queue.channel?.send(`❌ Fehler beim Abspielen: ${error.message}`), DELETE_ERROR_MS);
        // Nächsten Song versuchen nach kurzem Delay
        setTimeout(() => playNext(guildId), 500);
    } finally {
        queue.playLock = false;
    }
}

// ── Nachrichten mit Auto-Delete senden ────────────────────────────
function autoDelete(msgPromise, ms = DELETE_EMBED_MS) {
    msgPromise
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), ms))
        .catch(() => {});
}

// ── Commands laden ────────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

// ── Context-Objekt für Commands ───────────────────────────────────
const ctx = {
    db, queues, getQueue, destroyQueue, searchTrack, searchTracks, searchEnhanced, spotifyFetch, searchPlaylist, isPlaylistUrl,
    playNext, joinChannel, ensureConnection, scheduleLeave, autoDelete, createStream, ffmpegPath,
    AudioPlayerStatus, VoiceConnectionStatus, StreamType,
    DELETE_SHORT_MS, DELETE_EMBED_MS, DELETE_ERROR_MS,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    parseDuration, getElapsed, createProgressBar, formatDuration, createPlayerButtons,
};

// ── API Broadcast & Access Codes (wird nach API-Start gesetzt) ──
let _apiBroadcast = () => {};
let _apiGetGuildState = () => ({});
let _generateAccessCode = () => 'N/A';
ctx.broadcast = (event, data) => _apiBroadcast(event, data);
ctx.getGuildState = (guildId) => _apiGetGuildState(guildId);
ctx.generateAccessCode = (guildId) => _generateAccessCode(guildId);

// ── Button Handler ────────────────────────────────────────────────
async function handleButton(interaction) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.current) {
        return interaction.reply({ content: '❌ Es wird gerade nichts abgespielt.', ephemeral: true });
    }

    // Prüfen ob User im Voice Channel ist
    if (!interaction.member.voice.channel) {
        return interaction.reply({ content: '❌ Du musst im Voice Channel sein!', ephemeral: true });
    }

    switch (interaction.customId) {
        case 'music_pause':
            if (queue.player.state.status === AudioPlayerStatus.Paused) {
                queue._playbackStart = Date.now() - (queue._pausedElapsed || 0) * 1000;
                queue.player.unpause();
                await interaction.reply({ content: 'Resumed.', ephemeral: true });
            } else {
                queue._pausedElapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
                queue.player.pause();
                await interaction.reply({ content: 'Paused.', ephemeral: true });
            }
            break;

        case 'music_skip':
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.player.stop();
            await interaction.reply({ content: `Skipped **${queue.current.title}**.`, ephemeral: true });
            break;

        case 'music_stop':
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.tracks = [];
            queue.current = null;
            queue._failedTrack = null;
            queue.stopped = true;
            if (queue._nowPlayingMsg) { queue._nowPlayingMsg.delete().catch(() => {}); queue._nowPlayingMsg = null; }
            if (queue.player) queue.player.stop(true);
            scheduleLeave(interaction.guildId);
            await interaction.reply({ content: 'Stopped.', ephemeral: true });
            break;

        case 'music_shuffle':
            if (queue.tracks.length < 2) {
                return interaction.reply({ content: '❌ Nicht genug Songs zum Mischen.', ephemeral: true });
            }
            for (let i = queue.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
            }
            await interaction.reply({ content: `Shuffled **${queue.tracks.length} songs**.`, ephemeral: true });
            break;

        case 'music_loop': {
            const modes = ['off', 'song', 'queue'];
            const labels = { off: 'Loop disabled.', song: 'Looping current song.', queue: 'Looping queue.' };
            const idx = (modes.indexOf(queue.loopMode) + 1) % modes.length;
            queue.loopMode = modes[idx];
            await interaction.reply({ content: labels[queue.loopMode], ephemeral: true });
            // Button auf Now Playing aktualisieren
            if (queue._nowPlayingMsg) {
                const row = createPlayerButtons(queue.loopMode);
                const embed = EmbedBuilder.from(queue._nowPlayingMsg.embeds[0]);
                if (queue.loopMode !== 'off') {
                    embed.setFooter({ text: queue.loopMode === 'song' ? 'Song Loop' : 'Queue Loop' });
                } else {
                    embed.setFooter(null);
                }
                queue._nowPlayingMsg.edit({ embeds: [embed], components: [row] }).catch(() => {});
            }
            break;
        }
    }
}

// ── Interaction Handler ──────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        try { await handleButton(interaction); } catch (e) { console.error('Button error:', e.message); }
        return;
    }

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
            try { await command.autocomplete(interaction, ctx); } catch (e) { console.error('Autocomplete error:', e.message); }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, ctx);
    } catch (error) {
        console.error(`Command ${interaction.commandName} error:`, error.message);
        const reply = { content: '❌ Beim Ausführen des Commands ist ein Fehler aufgetreten.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
});

// ── Auto-Pause wenn Voice Channel leer ───────────────────────────
client.on('voiceStateUpdate', (oldState, newState) => {
    const guildId = oldState.guild.id || newState.guild.id;
    const queue = queues.get(guildId);
    if (!queue || !queue.connection || !queue.player) return;

    const botChannel = queue.connection.joinConfig.channelId;
    const channel = oldState.guild.channels.cache.get(botChannel);
    if (!channel) return;

    // Nur echte User zählen (nicht den Bot)
    const members = channel.members.filter(m => !m.user.bot).size;

    if (members === 0 && queue.player.state.status === AudioPlayerStatus.Playing) {
        queue.player.pause();
        queue._autoPaused = true;
        autoDelete(queue.channel?.send('⏸️ Pausiert — niemand im Channel.'), DELETE_SHORT_MS);
    } else if (members > 0 && queue._autoPaused) {
        queue.player.unpause();
        queue._autoPaused = false;
        autoDelete(queue.channel?.send('▶️ Fortgesetzt — willkommen zurück!'), DELETE_SHORT_MS);
    }
});

// ── Graceful Shutdown: Prozesse beenden + DB flushen ────────────
function gracefulShutdown() {
    for (const [guildId, queue] of queues) {
        for (const proc of queue.processes) {
            if (!proc.killed) proc.kill();
        }
        queue.processes.clear();
    }
    try { db.saveNow(); } catch {}
}
process.once('SIGTERM', gracefulShutdown);
process.once('SIGINT', gracefulShutdown);

// ── Unhandled Errors abfangen (verhindert Crashes) ──────────────
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err?.message || err);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err?.message || err);
});

// ── Discord Reconnect & Error Handling ──────────────────────────
client.on('error', (err) => {
    console.error('Discord client error:', err.message);
});
client.on('warn', (msg) => {
    console.warn('Discord warning:', msg);
});

// ── Bot starten ───────────────────────────────────────────────────
client.once('ready', () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    client.user.setActivity('/play', { type: ActivityType.Listening });
    const api = startAPI(ctx, client);
    _apiBroadcast = api.broadcast;
    _apiGetGuildState = api.getGuildState;
    _generateAccessCode = api.generateAccessCode;
});

db.init().then(() => {
    console.log('📦 Datenbank initialisiert');
    client.login(process.env.DISCORD_TOKEN);
}).catch(err => {
    console.error('❌ Datenbank-Fehler:', err.message);
    process.exit(1);
});

const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, VoiceConnectionDisconnectReason, entersState, StreamType } = require('@discordjs/voice');
const { spawn, execFileSync } = require('child_process'); // execFileSync für yt-dlp detection


const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('../../../libs/loadEnv').loadEnv('MUSIC', path.join(__dirname, '..'));
const { startAPI } = require('./api');
const db = require('./database');
const { t, normalizeLocale } = require('./i18n');
const { notifyError, notifyOnline } = require('../../../libs/notify');
const { startStatusUpdater } = require('../../../libs/status');
// Server-Sprache fuer Hintergrund-Nachrichten ohne Interaction (Now-Playing-Embed):
// explizite Einstellung (guild_settings.language), sonst Default 'de'.
function guildLocaleFor(guildId) {
    try {
        const stored = guildId ? db.getGuildSettings(guildId).language : null;
        return (stored === 'de' || stored === 'en') ? stored : 'de';
    } catch { return 'de'; }
}

// ── Konstanten ────────────────────────────────────────────────────
const DELETE_SHORT_MS = 30_000;     // 30 Sekunden (skip, pause, stop, join)
const DELETE_EMBED_MS = 60_000;     // 60 Sekunden (play, queue, nowplaying)
const DELETE_ERROR_MS = 10_000;     // 10 Sekunden (Fehler)
const DELETE_NOWPLAYING_MS = 24 * 60 * 60_000; // 24 Stunden ("Now Playing" bleibt stehen)
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
            guildId,
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
    clearTimeout(queue._aloneTimer);
    queue._aloneTimer = null;
    releaseNowPlaying(queue);
    if (queue._prefetch) {
        const pf = queue._prefetch;
        queue._prefetch = null;
        if (pf.proc && !pf.proc.killed) pf.proc.kill();
        fs.unlink(pf.file, () => {});
    }
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
// YTDLP_PATH: expliziter Override (lokal, wenn kein/zu altes System-yt-dlp da
// ist — das gebuendelte youtube-dl-exec-yt-dlp braucht Python 3.10+). In Prod
// ungesetzt -> unveraendertes Verhalten (Docker bringt ein aktuelles yt-dlp mit).
let ytdlpPath = process.env.YTDLP_PATH;
if (!ytdlpPath) {
    try {
        execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
        ytdlpPath = 'yt-dlp';
    } catch {
        const ytdlpBin = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        ytdlpPath = path.join(path.dirname(require.resolve('youtube-dl-exec')), '..', 'bin', ytdlpBin);
    }
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

// YouTube auf einer Rechenzentrums-IP funktioniert nur dreifach abgesichert:
//  1) --proxy WARP            -> saubere Cloudflare-IP (umgeht den harten IP-Block)
//  2) POT-Token (fetch_pot=always) via bgutil-Provider -> "kein Bot"-Nachweis
//  3) --remote-components ejs  -> löst die neue YouTube JS-Signatur / n-challenge
// Hinweis: Der POT-Request an den Provider läuft NICHT über den Proxy (das
// bgutil-Plugin umgeht ihn), daher reicht der interne Alias pot-provider:4416.
const POT_PROVIDER_URL = process.env.POT_PROVIDER_URL || 'http://pot-provider:4416';
const YTDLP_PROXY = process.env.YTDLP_PROXY || 'socks5://warp:1080';
// Lokaler Opt-out: YTDLP_PROXY=direct laesst yt-dlp OHNE Proxy/POT-Provider ueber
// die lokale IP laufen (die Coolify-Aliasse warp:1080/pot-provider:4416 existieren
// nur im Server-Docker-Netz). Prod setzt den echten Proxy -> Args unveraendert.
const YT_DIRECT = ['direct', 'none', 'off', 'local'].includes(YTDLP_PROXY.toLowerCase());
const YT_EXTRACTOR_ARGS = YT_DIRECT
    ? ['--remote-components', 'ejs:github']
    : [
        '--proxy', YTDLP_PROXY,
        '--remote-components', 'ejs:github',
        '--extractor-args', 'youtube:player_client=web;fetch_pot=always',
        '--extractor-args', `youtubepot-bgutilhttp:base_url=${POT_PROVIDER_URL}`,
    ];
if (YT_DIRECT) console.log('yt-dlp: DIRECT-Modus (ohne Proxy/POT — nur lokal gedacht)');

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

    let info;
    try {
        const data = await spotifyFetch(`/tracks/${parsed.id}`);
        info = spotifyTrackToSearch(data);
    } catch {
        // Embed-Fallback wenn API fehlschlägt
        const entity = await fetchSpotifyEmbed('track', parsed.id);
        const trackData = entity.trackList?.[0] || entity;
        info = {
            searchQuery: `${trackData.title || entity.name} ${trackData.subtitle || ''}`.trim(),
            title: trackData.subtitle ? `${trackData.subtitle} – ${trackData.title || entity.name}` : (trackData.title || entity.name),
            duration: formatDuration(Math.floor((trackData.duration || 0) / 1000)),
            artist: trackData.subtitle || null,
            albumArt: entity.coverArt?.sources?.[0]?.url || null,
        };
    }

    const ytTrack = await searchTrack(info.searchQuery);
    ytTrack.title = info.title;
    if (info.artist) ytTrack.artist = info.artist;
    if (info.albumArt) ytTrack.albumArt = info.albumArt;
    return ytTrack;
}

// Spotify Embed-Seite parsen (kein API-Key nötig, funktioniert immer)
function fetchSpotifyEmbed(type, id) {
    return new Promise((resolve, reject) => {
        const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
        const req = https.get(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000,
        }, (res) => {
            // Redirects folgen
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res2) => {
                    let data = '';
                    res2.on('data', (d) => data += d);
                    res2.on('end', () => resolveEmbed(data, resolve, reject));
                }).on('error', reject);
                return;
            }
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => resolveEmbed(data, resolve, reject));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Spotify Embed: Timeout')); });
    });
}

function resolveEmbed(html, resolve, reject) {
    const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (!match) return reject(new Error('Spotify Embed: Keine Daten gefunden'));
    try {
        const data = JSON.parse(match[1]);
        const entity = data.props?.pageProps?.state?.data?.entity;
        if (!entity) return reject(new Error('Spotify Embed: Keine Entity-Daten'));
        resolve(entity);
    } catch { reject(new Error('Spotify Embed: Ungültige Daten')); }
}

async function searchSpotifyPlaylist(url) {
    const parsed = parseSpotifyUrl(url);
    if (!parsed) throw new Error('Ungültige Spotify-URL');

    let title = 'Spotify Playlist';
    let allTracks = [];

    // Zuerst mit App-Credentials versuchen
    try {
        if (parsed.type === 'playlist') {
            const data = await spotifyFetch(`/playlists/${parsed.id}?market=DE`);
            title = data.name || title;
            if (data.tracks?.items) {
                allTracks = data.tracks.items.filter(i => i.track && !i.track.is_local).map(i => i.track);
                let next = data.tracks?.next;
                while (next) {
                    const page = await spotifyFetch(next.replace('https://api.spotify.com/v1', ''));
                    allTracks.push(...(page.items || []).filter(i => i.track && !i.track.is_local).map(i => i.track));
                    next = page.next;
                }
            }
        } else if (parsed.type === 'album') {
            const data = await spotifyFetch(`/albums/${parsed.id}?market=DE`);
            title = `${data.artists?.[0]?.name || ''} – ${data.name || 'Album'}`.trim();
            allTracks = data.tracks?.items || [];
        }
    } catch (e) {
        console.log('Spotify API Fehler:', e.message);
    }

    // Fallback: Embed-Seite scrapen wenn keine Tracks gefunden
    if (allTracks.length === 0) {
        console.log('Spotify: Nutze Embed-Seite als Fallback...');
        const entity = await fetchSpotifyEmbed(parsed.type, parsed.id);
        title = entity.name || entity.title || title;

        allTracks = (entity.trackList || []).filter(t => t.uri && t.isPlayable !== false).map(t => ({
            name: t.title,
            artists: [{ name: t.subtitle || '' }],
            duration_ms: t.duration || 0,
            album: { images: entity.coverArt?.sources || [] },
        }));
    }

    if (allTracks.length === 0) throw new Error('Leere Spotify-Playlist/Album');

    // Alle Spotify-Tracks parallel auf YouTube suchen
    const tracks = [];
    const batchSize = 10;
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
    const batchSize = 10;
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

// ── Deezer (öffentliche API, keine Auth nötig) ───────────────────
function isDeezerUrl(url) {
    return url.includes('deezer.com/') || url.includes('deezer.page.link/');
}

function parseDeezerUrl(url) {
    // Unterstützt: deezer.com/track/ID, /album/ID, /playlist/ID (mit optionalem Storefront wie /de/)
    const match = url.match(/deezer\.com\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)/);
    if (!match) return null;
    return { type: match[1], id: match[2] };
}

function deezerFetch(endpoint) {
    return new Promise((resolve, reject) => {
        const req = https.get(`https://api.deezer.com${endpoint}`, { timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(json.error.message || `Deezer API Fehler`));
                    resolve(json);
                } catch { reject(new Error('Deezer API: Ungültige Antwort')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Deezer API: Timeout')); });
    });
}

function deezerTrackToSearch(track) {
    const artists = track.artist?.name || '';
    const albumArt = track.album?.cover_medium || track.album?.cover || null;
    return {
        searchQuery: `${track.title} ${artists}`,
        title: artists ? `${artists} – ${track.title}` : track.title,
        duration: formatDuration(track.duration || 0),
        artist: artists || null,
        albumArt,
    };
}

async function searchDeezerTrack(url) {
    const parsed = parseDeezerUrl(url);
    if (!parsed || parsed.type !== 'track') throw new Error('Ungültige Deezer-Track-URL');
    const data = await deezerFetch(`/track/${parsed.id}`);
    const info = deezerTrackToSearch(data);
    const ytTrack = await searchTrack(info.searchQuery);
    ytTrack.title = info.title;
    if (info.artist) ytTrack.artist = info.artist;
    if (info.albumArt) ytTrack.albumArt = info.albumArt;
    return ytTrack;
}

async function searchDeezerPlaylist(url) {
    const parsed = parseDeezerUrl(url);
    if (!parsed) throw new Error('Ungültige Deezer-URL');

    let title = 'Deezer Playlist';
    let allTracks = [];

    if (parsed.type === 'playlist') {
        const data = await deezerFetch(`/playlist/${parsed.id}`);
        title = data.title || title;
        allTracks = data.tracks?.data || [];
    } else if (parsed.type === 'album') {
        const data = await deezerFetch(`/album/${parsed.id}`);
        title = `${data.artist?.name || ''} – ${data.title || 'Album'}`.trim();
        // Album-Tracks haben kein album-Objekt, also manuell setzen
        const albumArt = data.cover_medium || data.cover || null;
        allTracks = (data.tracks?.data || []).map(t => ({
            ...t,
            album: { cover_medium: albumArt, cover: albumArt },
            artist: t.artist || data.artist,
        }));
    }

    if (allTracks.length === 0) throw new Error('Leere Deezer Playlist/Album');

    const tracks = [];
    const batchSize = 10;
    for (let i = 0; i < allTracks.length; i += batchSize) {
        const batch = allTracks.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(async (t) => {
                const info = deezerTrackToSearch(t);
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

    if (tracks.length === 0) throw new Error('Konnte keine Songs von Deezer auf YouTube finden');
    console.log(`Deezer: ${tracks.length}/${allTracks.length} Songs gefunden für "${title}"`);
    return { title, tracks };
}

// ── Amazon Music (kein öffentliches API — Fallback über yt-dlp) ──
function isAmazonMusicUrl(url) {
    return /music\.amazon\.(com|de|co\.uk|fr|it|es|co\.jp|in|com\.br|com\.mx|com\.au)\//.test(url);
}

function parseAmazonMusicUrl(url) {
    const match = url.match(/music\.amazon\.[^/]+\/(playlists|albums|tracks)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    const typeMap = { playlists: 'playlist', albums: 'album', tracks: 'track' };
    return { type: typeMap[match[1]] || match[1], id: match[2] };
}

// ── Piped API (schnelle Suche mit Instance-Rotation + Circuit Breaker) ──
const PIPED_INSTANCES = [
    'https://api.piped.private.coffee',
    'https://pipedapi.reallyaweso.me',
    'https://pipedapi.kavin.rocks',
];
let pipedInstanceIndex = 0;
let pipedDownUntil = 0;          // Circuit Breaker: Timestamp bis wann Piped übersprungen wird
let pipedConsecutiveFails = 0;   // Zähler für aufeinanderfolgende Ausfälle
const PIPED_COOLDOWN_MS = 5 * 60_000; // 5 Minuten Cooldown wenn alle Instanzen tot

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
    // Circuit Breaker: Piped komplett überspringen wenn kürzlich alle Instanzen ausgefallen
    if (Date.now() < pipedDownUntil) {
        throw new Error('Piped API: Circuit Breaker aktiv');
    }

    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
        const idx = (pipedInstanceIndex + i) % PIPED_INSTANCES.length;
        try {
            const result = await pipedFetchSingle(PIPED_INSTANCES[idx], endpoint);
            pipedInstanceIndex = idx;
            pipedConsecutiveFails = 0; // Reset bei Erfolg
            pipedDownUntil = 0;
            return result;
        } catch (err) {
            if (i === PIPED_INSTANCES.length - 1) {
                pipedConsecutiveFails++;
                // Sofort Circuit Breaker aktivieren wenn alle Instanzen tot
                if (pipedConsecutiveFails >= 1) {
                    pipedDownUntil = Date.now() + PIPED_COOLDOWN_MS;
                    console.log(`Piped: Alle Instanzen ausgefallen, überspringe für ${PIPED_COOLDOWN_MS / 60000} Minuten`);
                }
                throw err;
            }
        }
    }
}

function isMusicResult(item) {
    if (!item || !item.url || item.type !== 'stream') return false;
    const dur = item.duration || 0;
    if (dur > 0 && (dur < 30 || dur > 900)) return false;
    const title = (item.title || '').toLowerCase();
    const uploader = (item.uploaderName || item.uploader || '').toLowerCase();
    const combined = title + ' ' + uploader;
    const nonMusic = [
        'gameplay', 'tutorial', 'review', 'unboxing', 'reaction', 'podcast',
        'compilat', 'highlights', 'trailer', 'vlog', 'how to', 'news', 'politics',
        'cooking', 'rezept', 'recipe', 'schnell und einfach', 'kochen', 'backen',
        'stiftung warentest', 'warentest', 'test der', 'im test',
        'geheimnisse', 'dokumentation', 'doku', 'reportage',
        'mukbang', 'asmr essen', 'food hack', 'lifehack',
        'prank', 'challenge', 'experiment', 'try not to',
        'nachrichten', 'tagesschau', 'interview', 'pressekonferenz',
    ];
    if (nonMusic.some(w => combined.includes(w))) return false;
    // Known non-music channels
    const nonMusicChannels = ['zdf', 'ard', 'rtl', 'sat.1', 'stiftung', 'warentest', 'chefkoch',
        'tasty', 'buzzfeed', 'galileo', 'spiegel', 'bild', 'focus', 'welt'];
    if (nonMusicChannels.some(c => uploader.includes(c))) return false;
    return true;
}

async function pipedSearch(query, limit = 5) {
    let data;
    try {
        data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
    } catch (err) {
        throw err;
    }
    const items = (data.items || []).filter(isMusicResult).slice(0, limit);
    if (items.length === 0) {
        // Fallback: video filter but with music keyword appended
        const musicQuery = query.includes('music') || query.includes('song') || query.includes('audio')
            ? query : `${query} music`;
        const data2 = await pipedFetch(`/search?q=${encodeURIComponent(musicQuery)}&filter=videos`);
        const items2 = (data2.items || []).filter(isMusicResult).slice(0, limit);
        if (items2.length === 0) throw new Error('Keine Ergebnisse');
        return items2;
    }
    return items;
}

function pipedToTrack(item) {
    // Piped liefert nur Proxy-Bild-URLs (proxy.<instanz>), die Discord oft nicht
    // laedt. Stattdessen direkt das offizielle YouTube-Thumbnail aus der Video-ID.
    const videoId = (item.url.match(/[?&]v=([\w-]{11})/) || [])[1];
    return {
        title: item.title || 'Unbekannter Titel',
        url: `https://www.youtube.com${item.url}`,
        duration: formatDuration(item.duration),
        durationSec: item.duration || 0,
        thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (item.thumbnail || null),
        artist: item.uploaderName || item.uploader || null,
    };
}

// ── Track URL Cache (avoid repeated YouTube lookups) ─────────────
const trackCache = new Map(); // query -> { track, ts }
const TRACK_CACHE_TTL = 30 * 60 * 1000; // 30 min
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of trackCache) { if (now - v.ts > TRACK_CACHE_TTL) trackCache.delete(k); }
}, 5 * 60 * 1000);

// Pre-resolve: resolve YouTube URLs in background for faster playback
function preResolveTrack(query) {
    if (!query || query.startsWith('http') || trackCache.has(query)) return;
    searchTrack(query).then(track => {
        trackCache.set(query, { track, ts: Date.now() });
    }).catch(() => {});
}

// ── Suche: Piped API mit yt-dlp Fallback ─────────────────────────
async function searchTrack(query) {
    // Check cache first
    const cached = trackCache.get(query);
    if (cached && Date.now() - cached.ts < TRACK_CACHE_TTL) return { ...cached.track };
    const isUrl = query.startsWith('http://') || query.startsWith('https://');

    // Spotify-Track-URL erkennen
    if (isUrl && isSpotifyUrl(query)) {
        return searchSpotifyTrack(query);
    }

    // Apple Music Track-URL erkennen
    if (isUrl && isAppleMusicUrl(query)) {
        return searchAppleMusicTrack(query);
    }

    // Deezer Track-URL erkennen
    if (isUrl && isDeezerUrl(query)) {
        return searchDeezerTrack(query);
    }

    // URLs direkt über yt-dlp auflösen (inkl. Amazon Music)
    if (isUrl) return searchTrackYtdlp(query);

    // Piped API für Textsuche (mit yt-dlp Fallback)
    let track;
    try {
        const items = await pipedSearch(query, 1);
        track = pipedToTrack(items[0]);
    } catch {
        try {
            track = await searchTrackYtdlp(`ytsearch1:${query}`);
        } catch (ytErr) {
            // YouTube blockiert/leer -> SoundCloud als Ausweichquelle
            try {
                track = await searchTrackYtdlp(`scsearch1:${query}`);
            } catch {
                throw ytErr;
            }
        }
    }
    trackCache.set(query, { track, ts: Date.now() });
    return track;
}

async function searchTracks(query, limit = 5) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        const track = await searchTrack(query);
        return [track];
    }

    // Piped API für Textsuche (mit yt-dlp Fallback)
    try {
        const items = await pipedSearch(query, limit);
        return items.map(pipedToTrack);
    } catch {
        return searchTracksYtdlp(query, limit);
    }
}

// ── Enhanced Search (kategorisiert + Spotify-Metadaten) ─────────

// Deezer fetch helper (no API key needed)
function deezerFetch(endpoint) {
    return new Promise((resolve, reject) => {
        require('https').get(`https://api.deezer.com${endpoint}`, { timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Deezer parse error')); } });
        }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Deezer timeout')); });
    });
}

async function searchEnhanced(query) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        const track = await searchTrack(query);
        return { tracks: [track], artists: [], albums: [] };
    }

    // Deezer-first: guaranteed music results, no rate limits
    const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
        deezerFetch(`/search?q=${encodeURIComponent(query)}&limit=10`),
        deezerFetch(`/search/artist?q=${encodeURIComponent(query)}&limit=5`),
        deezerFetch(`/search/album?q=${encodeURIComponent(query)}&limit=5`),
    ]);

    const deezerTracks = tracksRes.status === 'fulfilled' ? (tracksRes.value.data || []) : [];
    const deezerArtists = artistsRes.status === 'fulfilled' ? (artistsRes.value.data || []) : [];
    const deezerAlbums = albumsRes.status === 'fulfilled' ? (albumsRes.value.data || []) : [];

    // Map Deezer tracks (url = search query for YouTube playback)
    let tracks = deezerTracks.map(t => ({
        title: t.title || '',
        artist: t.artist?.name || '',
        artistImage: t.artist?.picture_medium || t.artist?.picture || null,
        thumbnail: t.album?.cover_medium || t.album?.cover || null,
        albumName: t.album?.title || null,
        duration: `${Math.floor((t.duration || 0) / 60)}:${String((t.duration || 0) % 60).padStart(2, '0')}`,
        url: `${t.artist?.name || ''} ${t.title || ''}`,
        source: 'deezer',
    }));

    // Fallback to YouTube if Deezer returns nothing
    if (tracks.length === 0) {
        try { tracks = await searchTracks(query, 10); } catch { tracks = []; }
    }

    return {
        tracks,
        artists: deezerArtists.map(a => ({
            id: String(a.id),
            name: a.name || '',
            image: a.picture_medium || a.picture || null,
            genres: [],
            followers: a.nb_fan || 0,
        })),
        albums: deezerAlbums.map(a => ({
            id: String(a.id),
            name: a.title || '',
            artist: a.artist?.name || '',
            image: a.cover_medium || a.cover || null,
            totalTracks: a.nb_tracks || 0,
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
            ...cookieArgs, ...YT_EXTRACTOR_ARGS, '--js-runtimes', 'node', searchQuery,
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

// ── SoundCloud-Ausweichquelle (wenn YouTube den Server als "Bot" blockt) ──
// Rohe SoundCloud-Suche (Liste mit Titel/Uploader/Dauer)
function soundcloudSearchRaw(query, limit = 5) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            `scsearch${limit}:${query}`,
        ]);
        let stdout = '', stderr = '';
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited ${code}`));
            try {
                const data = JSON.parse(stdout);
                const entries = data.entries || [data];
                resolve(entries.filter(Boolean).map(i => ({
                    title: i.title || '',
                    url: i.webpage_url || i.url,
                    uploader: i.uploader || i.channel || '',
                    duration: i.duration || 0,
                })));
            } catch { reject(new Error('SoundCloud parse error')); }
        });
        proc.on('error', (e) => reject(e));
    });
}

// Loest denselben Titel auf SoundCloud auf; filtert Sped-Up/Nightcore/Remix/Preview
// aus und bevorzugt Treffer mit passender Laenge (nahe der Originaldauer).
async function resolveSoundcloudUrl(track) {
    const query = [track.artist, track.title].filter(Boolean).join(' ').trim() || track.title;
    let results = [];
    try { results = await soundcloudSearchRaw(query, 5); } catch { results = []; }
    if (!results.length) return searchTrackYtdlp(`scsearch1:${query}`).then(r => r.url);

    const bad = /sped\s?-?\s?up|spedup|nightcore|slowed|reverb|8d\s?audio|\bremix\b|mashup|preview|snippet|karaoke|instrumental|chipmunk|pitched/i;
    const orig = track.durationSec || 0;
    const durOk = (d) => !orig || !d || Math.abs(d - orig) <= orig * 0.25;

    const pick = results.find(r => !bad.test(r.title) && durOk(r.duration))
              || results.find(r => !bad.test(r.title))
              || results[0];
    return pick.url;
}

function searchTracksYtdlp(query, limit = 5) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, ...YT_EXTRACTOR_ARGS, '--js-runtimes', 'node', `ytsearch${limit}:${query}`,
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
                const tracks = entries.filter(i => {
                    if (!i) return false;
                    const dur = i.duration || 0;
                    if (dur > 0 && (dur < 30 || dur > 900)) return false;
                    const title = (i.title || '').toLowerCase();
                    const channel = (i.channel || i.uploader || '').toLowerCase();
                    const combined = title + ' ' + channel;
                    const nonMusic = [
                        'gameplay', 'tutorial', 'review', 'unboxing', 'reaction', 'podcast',
                        'compilat', 'highlights', 'trailer', 'vlog', 'how to',
                        'cooking', 'rezept', 'recipe', 'schnell und einfach', 'kochen', 'backen',
                        'stiftung warentest', 'warentest', 'im test', 'test der',
                        'geheimnisse', 'dokumentation', 'doku', 'reportage',
                        'mukbang', 'prank', 'challenge', 'experiment',
                        'nachrichten', 'interview', 'pressekonferenz',
                    ];
                    if (nonMusic.some(w => combined.includes(w))) return false;
                    const nonChannels = ['zdf', 'ard', 'rtl', 'stiftung', 'chefkoch', 'tasty', 'galileo', 'spiegel', 'bild'];
                    if (nonChannels.some(c => channel.includes(c))) return false;
                    return true;
                }).map(info => ({
                    title: info.title || 'Unbekannter Titel',
                    url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                    duration: formatDuration(info.duration),
                    durationSec: info.duration || 0,
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                    artist: info.artist || info.creator || info.channel || info.uploader || null,
                    album: info.album || null,
                    albumArt: info.thumbnail || info.thumbnails?.find(t => t.width >= 300)?.url || null,
                }));
                resolve(tracks);
            } catch {
                reject(new Error('Konnte Suchergebnisse nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

// ── Progressives Playlist-Loading ────────────────────────────────
// Holt nur die Metadaten (Titel, Artist, Duration) ohne YouTube-Auflösung
async function fetchPlaylistMeta(url) {
    if (isSpotifyUrl(url)) {
        const parsed = parseSpotifyUrl(url);
        if (!parsed || parsed.type === 'track') return null;

        let title = 'Spotify Playlist';
        let rawTracks = [];

        // API versuchen
        try {
            if (parsed.type === 'playlist') {
                const data = await spotifyFetch(`/playlists/${parsed.id}?market=DE`);
                title = data.name || title;
                if (data.tracks?.items) {
                    rawTracks = data.tracks.items
                        .filter(i => i.track && !i.track.is_local)
                        .map(i => spotifyTrackToSearch(i.track));
                }
            } else if (parsed.type === 'album') {
                const data = await spotifyFetch(`/albums/${parsed.id}?market=DE`);
                title = `${data.artists?.[0]?.name || ''} – ${data.name || 'Album'}`.trim();
                rawTracks = (data.tracks?.items || []).map(t => spotifyTrackToSearch(t));
            }
        } catch {}

        // Embed-Fallback
        if (rawTracks.length === 0) {
            const entity = await fetchSpotifyEmbed(parsed.type, parsed.id);
            title = entity.name || entity.title || title;
            rawTracks = (entity.trackList || [])
                .filter(t => t.uri && t.isPlayable !== false)
                .map(t => spotifyTrackToSearch({
                    name: t.title,
                    artists: [{ name: t.subtitle || '' }],
                    duration_ms: t.duration || 0,
                    album: { images: entity.coverArt?.sources || [] },
                }));
        }

        return rawTracks.length > 0 ? { title, rawTracks } : null;
    }

    if (isAppleMusicUrl(url)) {
        const parsed = parseAppleMusicUrl(url);
        if (!parsed || parsed.type === 'track') return null;

        let title = 'Apple Music Playlist';
        let allTracks = [];

        if (parsed.type === 'album') {
            const data = await appleMusicFetch(`/catalog/${parsed.storefront}/albums/${parsed.id}`);
            const album = data.data?.[0];
            if (!album) return null;
            const attrs = album.attributes || {};
            title = `${attrs.artistName || ''} – ${attrs.name || 'Album'}`.trim();
            allTracks = album.relationships?.tracks?.data || [];
        } else if (parsed.type === 'playlist') {
            const data = await appleMusicFetch(`/catalog/${parsed.storefront}/playlists/${parsed.id}`);
            const playlist = data.data?.[0];
            if (!playlist) return null;
            title = playlist.attributes?.name || title;
            allTracks = playlist.relationships?.tracks?.data || [];
        }

        const rawTracks = allTracks.map(t => appleMusicTrackToSearch(t));
        return rawTracks.length > 0 ? { title, rawTracks } : null;
    }

    if (isDeezerUrl(url)) {
        const parsed = parseDeezerUrl(url);
        if (!parsed || parsed.type === 'track') return null;

        let title = 'Deezer Playlist';
        let allTracks = [];

        if (parsed.type === 'playlist') {
            const data = await deezerFetch(`/playlist/${parsed.id}`);
            title = data.title || title;
            allTracks = data.tracks?.data || [];
        } else if (parsed.type === 'album') {
            const data = await deezerFetch(`/album/${parsed.id}`);
            title = `${data.artist?.name || ''} – ${data.title || 'Album'}`.trim();
            const albumArt = data.cover_medium || data.cover || null;
            allTracks = (data.tracks?.data || []).map(t => ({
                ...t,
                album: { cover_medium: albumArt, cover: albumArt },
                artist: t.artist || data.artist,
            }));
        }

        const rawTracks = allTracks.map(t => deezerTrackToSearch(t));
        return rawTracks.length > 0 ? { title, rawTracks } : null;
    }

    // YouTube/Amazon Music: kein progressives Loading möglich
    return null;
}

// Löst Tracks im Hintergrund auf und fügt sie zur Queue hinzu
function resolvePlaylistInBackground(guildId, rawTracks, user) {
    const batchSize = 10;
    let resolved = 0;

    (async () => {
        for (let i = 0; i < rawTracks.length; i += batchSize) {
            // Abbrechen wenn Queue nicht mehr existiert (z.B. /stop, /disconnect)
            const queue = queues.get(guildId);
            if (!queue) break;

            const batch = rawTracks.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async (info) => {
                    const ytTrack = await searchTrack(info.searchQuery);
                    ytTrack.title = info.title;
                    if (info.artist) ytTrack.artist = info.artist;
                    if (info.albumArt) ytTrack.albumArt = info.albumArt;
                    ytTrack.requestedBy = user.toString();
                    ytTrack._requestedById = user.id;
                    return ytTrack;
                })
            );
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    queue.tracks.push(r.value);
                    resolved++;
                }
            }
            // Falls nichts spielt und Tracks da sind, starten
            if (queue.connection && !queue.current && queue.tracks.length > 0) {
                playNext(guildId);
            }
        }
        if (resolved > 0) console.log(`Playlist: ${resolved}/${rawTracks.length} Tracks im Hintergrund geladen`);
    })().catch(err => console.error('Hintergrund-Playlist-Fehler:', err.message));
}

async function searchPlaylist(url) {
    // Spotify-Playlists/Alben über Spotify API + YouTube-Suche
    if (isSpotifyUrl(url)) return searchSpotifyPlaylist(url);

    // Apple Music Playlists/Alben
    if (isAppleMusicUrl(url)) return searchAppleMusicPlaylist(url);

    // Deezer Playlists/Alben
    if (isDeezerUrl(url)) return searchDeezerPlaylist(url);

    // Amazon Music & alles andere über yt-dlp
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--yes-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, ...YT_EXTRACTOR_ARGS, '--js-runtimes', 'node', url,
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
    if (isDeezerUrl(url)) {
        const parsed = parseDeezerUrl(url);
        return parsed && (parsed.type === 'playlist' || parsed.type === 'album');
    }
    if (isAmazonMusicUrl(url)) {
        const parsed = parseAmazonMusicUrl(url);
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

function createProgressBar(elapsed, total, length = 20) {
    const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
    const filled = Math.round(progress * length);
    const bar = '━'.repeat(filled) + '●' + '─'.repeat(Math.max(length - filled, 0));
    return `\`${formatDuration(elapsed)}\` ${bar} \`${formatDuration(total)}\``;
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
function createStream(url, queue, onError, seekSeconds = 0, localFile = null) {
    // localFile: vorgeladene Audio-Datei (Prefetch) -> yt-dlp entfaellt komplett
    const ytdlp = localFile ? null : spawn(ytdlpPath, [
        '-f', 'bestaudio/bestaudio*/best',
        '-o', '-', '--no-check-certificates', '--no-warnings',
        '--force-ipv4', '--retries', '3', '--extractor-retries', '3',
        ...cookieArgs, ...YT_EXTRACTOR_ARGS, '--js-runtimes', 'node', url,
    ]);

    let filterArgs = AUDIO_FILTERS[queue.filter] || [];
    // Custom EQ: build FFmpeg equalizer chain from band values
    if (queue.filter === 'custom' && Array.isArray(queue.eqBands) && queue.eqBands.some(v => v !== 0)) {
        const freqs = [60, 150, 400, 1000, 2500, 6000, 16000];
        const eqChain = queue.eqBands.map((gain, i) => `equalizer=f=${freqs[i]}:width_type=o:width=1.5:g=${gain}`).join(',');
        filterArgs = ['-af', eqChain];
    }

    const ffmpeg = spawn(ffmpegPath, [
        ...(seekSeconds > 0 ? ['-ss', String(seekSeconds)] : []),
        '-i', localFile || 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', 'error',
        ...filterArgs,
        '-f', 'ogg',
        '-acodec', 'libopus',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ]);

    let hasData = false;
    ffmpeg.stdout.on('data', () => { hasData = true; });

    if (ytdlp) {
        ytdlp.stdout.pipe(ffmpeg.stdin);
        ffmpeg.stdin.on('error', () => {}); // Broken pipe ignorieren

        let stderrOutput = '';
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
        ytdlp.on('error', (e) => { console.error('yt-dlp spawn error:', e.message); onError?.(e); });
        queue.processes.add(ytdlp);
    }

    ffmpeg.stderr.on('data', (d) => console.error('ffmpeg stderr:', d.toString().trim()));
    ffmpeg.on('close', () => {
        queue.processes.delete(ffmpeg);
        if (localFile) fs.unlink(localFile, () => {}); // Prefetch-Datei aufraeumen
    });
    ffmpeg.on('error', (e) => { console.error('ffmpeg spawn error:', e.message); onError?.(e); });

    queue.processes.add(ffmpeg);
    return ffmpeg.stdout;
}

// ── Naechsten Track vorladen (macht /skip nahezu verzoegerungsfrei) ──
// Laedt queue.tracks[0] im Hintergrund komplett herunter (inkl. YouTubes
// 4s-Zwangspause und Extraktion). Beim Abspielen wird die Datei direkt
// an ffmpeg gegeben statt neu ueber yt-dlp zu streamen.
function prefetchNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;
    const next = queue.tracks[0];

    // Bestehenden Prefetch verwerfen, wenn er nicht (mehr) zum naechsten Track passt
    if (queue._prefetch && queue._prefetch.url !== next?.url) {
        const old = queue._prefetch;
        queue._prefetch = null;
        if (old.proc && !old.proc.killed) old.proc.kill();
        fs.unlink(old.file, () => {});
    }
    if (!next || !next.url || queue._prefetch) return;

    const file = path.join(os.tmpdir(), `prefetch-${guildId}`);
    const proc = spawn(ytdlpPath, [
        '-f', 'bestaudio/bestaudio*/best',
        '-o', file, '--force-overwrites', '--no-check-certificates', '--no-warnings',
        '--force-ipv4', '--retries', '3', '--extractor-retries', '3',
        ...cookieArgs, ...YT_EXTRACTOR_ARGS, '--js-runtimes', 'node', next.url,
    ]);
    const pf = { url: next.url, file, proc, done: false };
    queue._prefetch = pf;
    proc.on('close', (code) => {
        if (queue._prefetch !== pf) return;
        if (code === 0) pf.done = true;
        else { queue._prefetch = null; fs.unlink(file, () => {}); }
    });
    proc.on('error', () => { if (queue._prefetch === pf) queue._prefetch = null; });
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

    // Sobald die Wiedergabe wirklich startet: "Lädt…"-Platzhalter -> volles Embed
    player.on(AudioPlayerStatus.Playing, async () => {
        const q = queues.get(guildId);
        if (!q || !q._npLoading) return;
        q._npLoading = false;
        try { await q._artPromise; } catch { /* egal, dann ohne Cover */ }
        updateNowPlayingMsg(q);
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

    // Disconnect-Handling: Kick sauber akzeptieren, Netz-Blips reconnecten.
    // WICHTIG: Nach einem Kick haengt die Connection in "Signalling" — darauf
    // zu warten liess den Bot frueher wieder joinen statt draussen zu bleiben.
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
            // Vom Server getrennt (Kick oder Channel geloescht). Bei einem
            // Channel-Move verbindet Discord selbst neu (-> Connecting);
            // passiert das nicht, war es ein Kick -> aufraeumen, NICHT rejoinen.
            try {
                await entersState(connection, VoiceConnectionStatus.Connecting, DISCONNECT_CHECK_MS);
            } catch {
                destroyQueue(guildId);
            }
        } else if (connection.rejoinAttempts < 5) {
            // Netzwerk-Blip: mit Backoff neu verbinden
            await new Promise(r => setTimeout(r, (connection.rejoinAttempts + 1) * 2_000));
            if (connection.state.status === VoiceConnectionStatus.Disconnected) connection.rejoin();
        } else {
            destroyQueue(guildId);
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

// ── Player-Buttons erstellen (2 Reihen) ─────────────────────────
function createPlayerButtons(loopMode, isPaused = false) {
    const loopEmoji = loopMode === 'song' ? '🔂' : '🔁';
    const loopStyle = loopMode !== 'off' ? ButtonStyle.Primary : ButtonStyle.Secondary;

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_pause').setEmoji(isPaused ? '▶️' : '⏸️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_loop').setEmoji(loopEmoji).setStyle(loopStyle),
        new ButtonBuilder().setLabel('Web Player').setEmoji('🎧').setStyle(ButtonStyle.Link).setURL('https://beatbyte.bytebots.de'),
    );
    return [row1, row2];
}

// ── Now Playing Embed bauen ──────────────────────────────────────
function buildNowPlayingEmbed(track, queue, clientOrInteraction, elapsed, loc = guildLocaleFor(queue.guildId)) {
    const botUser = clientOrInteraction.user || clientOrInteraction;
    const isPaused = queue.player?.state?.status === AudioPlayerStatus.Paused;

    const descLines = [];
    descLines.push(`### ${track.title}`);
    if (track.artist) descLines.push(`*${track.artist}*`);
    descLines.push('');

    // Progress bar
    const elapsedSec = typeof elapsed === 'number' ? elapsed : 0;
    const total = parseDuration(track.duration);
    descLines.push(createProgressBar(elapsedSec, total));

    // Status als kleine Zeile
    const status = [];
    if (track.requestedBy) status.push(track.requestedBy);
    if (queue.tracks.length > 0) status.push(`📋 ${t('np.inQueue', loc, { n: queue.tracks.length })}`);
    if (queue.loopMode === 'song') status.push('🔂 Song');
    else if (queue.loopMode === 'queue') status.push('🔁 Queue');
    if (queue.filter && queue.filter !== 'off') {
        const labels = { bassboost: 'Bassboost', nightcore: 'Nightcore', slowed: 'Slowed' };
        status.push(`🎛️ ${labels[queue.filter] || queue.filter}`);
    }
    if (queue.autoDj) status.push('🤖 Auto-DJ');
    if (status.length > 0) {
        descLines.push(`-# ${status.join('  ·  ')}`);
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: isPaused ? t('np.paused', loc) : t('np.nowPlaying', loc), iconURL: botUser.displayAvatarURL() })
        .setDescription(descLines.join('\n'))
        .setThumbnail(track.albumArt || track.thumbnail || null)
        .setColor(isPaused ? 0x95a5a6 : 0x6E41CC);

    return embed;
}

// Platzhalter-Embed, solange der Song noch lädt (wird bei Wiedergabestart ersetzt)
function buildLoadingEmbed(track, clientOrInteraction, loc = 'de') {
    const botUser = clientOrInteraction.user || clientOrInteraction;
    const lines = [`### ${track.title}`];
    if (track.artist) lines.push(`*${track.artist}*`);
    lines.push('');
    lines.push(t('np.loadingLine', loc));
    return new EmbedBuilder()
        .setAuthor({ name: t('np.loadingTitle', loc), iconURL: botUser.displayAvatarURL() })
        .setDescription(lines.join('\n'))
        .setThumbnail(track.albumArt || track.thumbnail || null)
        .setColor(0x95a5a6);
}

// Quadratisches Album-Cover nachladen (Deezer, dann iTunes — beides ohne Key).
// YouTube-Thumbnails sind letterboxed (schwarze Balken); echte Album-Art sieht
// im Embed groesser und sauberer aus. Mit Titel-Abgleich gegen falsche Treffer.
async function ensureAlbumArt(track) {
    if (track.albumArt) return;
    const term = [track.artist, track.title].filter(Boolean).join(' ').trim() || track.title;
    if (!term) return;
    const norm = s => (s || '').toLowerCase();

    // 1) Deezer (gute Trefferquote, 500x500-Cover)
    try {
        const data = await deezerFetch(`/search?q=${encodeURIComponent(term)}&limit=3`);
        const hit = (data?.data || []).find(h =>
            fuzzyMatch(norm(track.title), norm(h.title)) >= 0.5 ||
            (h.artist?.name && norm(term).includes(norm(h.artist.name))));
        const art = hit?.album?.cover_big || hit?.album?.cover_medium;
        if (art) { track.albumArt = art; return; }
    } catch { /* weiter mit iTunes */ }

    // 2) iTunes-Fallback (600x600)
    try {
        const data = await new Promise((resolve, reject) => {
            https.get(`https://itunes.apple.com/search?media=music&limit=3&term=${encodeURIComponent(term)}`,
                { timeout: 5000 }, (res) => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse')); } });
                }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('timeout')); });
        });
        const hit = (data?.results || []).find(r =>
            fuzzyMatch(norm(track.title), norm(r.trackName)) >= 0.5 ||
            (r.artistName && norm(term).includes(norm(r.artistName))));
        if (hit?.artworkUrl100) {
            track.albumArt = hit.artworkUrl100.replace(/100x100(bb)?/, '600x600$1');
        }
    } catch { /* egal, dann halt YouTube-Thumbnail */ }
}

// ── Now Playing Nachricht aktualisieren ──────────────────────────
function updateNowPlayingMsg(queue) {
    if (!queue._nowPlayingMsg || !queue.current) return Promise.resolve();
    const isPaused = queue.player?.state?.status === AudioPlayerStatus.Paused;
    const elapsed = getElapsed(queue);
    const rows = createPlayerButtons(queue.loopMode, isPaused);
    const embed = buildNowPlayingEmbed(queue.current, queue, client, elapsed);
    return queue._nowPlayingMsg.edit({ embeds: [embed], components: rows }).catch(() => {});
}

// ── Live-Progress: laufende Now-Playing-Embeds alle 10s aktualisieren ──
// (10s = Discord-Edit-freundlich und entspricht ~1 Segment des 20er-Balkens)
setInterval(() => {
    for (const [guildId, queue] of queues.entries()) {
        if (!queue.current) continue;
        // Sicherheitsnetz: naechsten Queue-Track vorladen, egal wie er reinkam
        // (Playlist, Auto-DJ, playnow) — prefetchNext ist idempotent.
        prefetchNext(guildId);
        if (!queue._nowPlayingMsg || queue._npLoading) continue;
        if (queue.player?.state?.status !== AudioPlayerStatus.Playing) continue;
        updateNowPlayingMsg(queue);
    }
}, 10_000);

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

    // Shuffle-Verhalten: zufaelliges Suchmuster + zufaellige Auswahl aus allen
    // Kandidaten, damit der Auto-DJ nicht immer dieselben Empfehlungen spielt.
    const patterns = artistMatch
        ? [`${artistMatch[1]} mix`, `${artistMatch[1]} beste songs`, `${artistMatch[1]} playlist`, `${cleanTitle} similar songs`]
        : [`${cleanTitle} similar songs`, `${cleanTitle} mix`, `${cleanTitle} radio`];
    const searchQuery = patterns[Math.floor(Math.random() * patterns.length)];

    const results = await searchTracks(searchQuery, 8);

    // Bereits gespielte URLs filtern
    const candidates = results.filter(t => !queue._djHistory.has(t.url));

    // Komplett zufaellig aus allen passenden Kandidaten waehlen
    const pool = candidates.length > 0 ? candidates : results;
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

        // Vorherige Nachricht: echtes Now-Playing 24h behalten, "Lädt…"-Platzhalter sofort weg
        if (queue._npLoading && queue._nowPlayingMsg) {
            queue._nowPlayingMsg.delete().catch(() => {});
            queue._nowPlayingMsg = null;
        } else {
            releaseNowPlaying(queue);
        }
        queue._npLoading = false;

        const track = queue.tracks.shift();
        queue.current = track;
        queue.skipVotes.clear();
        queue._playbackStart = Date.now();
        queue._seekOffset = 0;
        // Cover schon mal im Hintergrund nachladen (falls keins vorhanden), damit
        // es beim Umschalten aufs volle Embed bereitsteht. Danach die Web-App
        // informieren, damit sie sofort das quadratische Cover zeigt.
        queue._artPromise = ensureAlbumArt(track)
            .then(() => ctx.broadcast('stateUpdate', ctx.getGuildState(guildId)))
            .catch(() => {});

        // Reset Auto-DJ counter when user manually queued a track
        if (track.requestedBy && track.requestedBy !== '\uD83E\uDD16 Auto-DJ') {
            queue._djConsecutive = 0;
        }

        // Track listening history (use requestedBy userId if available, fallback to guild)
        try {
            const historyUserId = track._requestedById || `guild_${guildId}`;
            db.addToHistory(historyUserId, guildId, track);
        } catch { /* non-critical */ }

        // YouTube blockiert den Server -> denselben Titel von SoundCloud streamen
        if (track._needsSoundcloud) {
            track._needsSoundcloud = false;
            try {
                const scUrl = await resolveSoundcloudUrl(track);
                if (scUrl) {
                    track.url = scUrl;
                    console.log(`SoundCloud-Ausweichquelle für "${track.title}": ${scUrl}`);
                }
            } catch (e) {
                console.error('SoundCloud-Fallback fehlgeschlagen:', e.message);
            }
        }

        // Vorgeladenen Track nutzen, falls er zum aktuellen passt und fertig ist
        let localFile = null;
        if (queue._prefetch) {
            const pf = queue._prefetch;
            if (pf.url === track.url && pf.done) {
                localFile = pf.file;
                queue._prefetch = null;
            } else if (pf.url === track.url) {
                // Laeuft noch -> abbrechen und normal streamen
                queue._prefetch = null;
                if (pf.proc && !pf.proc.killed) pf.proc.kill();
                fs.unlink(pf.file, () => {});
            }
        }

        const stream = createStream(track.url, queue, (err) => {
            const ytBlocked = /not a bot|confirm you.?re not a bot|sign in to confirm/i.test(err.message);
            const isYtUrl = /youtube\.com|youtu\.be/.test(track.url || '');
            if (ytBlocked && isYtUrl && !track._scTried) {
                // Einmalig auf SoundCloud ausweichen (neue Quelle -> Retry erlaubt)
                track._scTried = true;
                track._needsSoundcloud = true;
                track._retried = false;
                queue._failedTrack = track;
                console.error(`YouTube blockiert bei "${track.title}" – weiche auf SoundCloud aus`);
            } else if (!track._retried) {
                track._retried = true;
                queue._failedTrack = track;
                console.error(`Stream-Fehler bei "${track.title}", Retry wird versucht...`);
            } else {
                autoDelete(queue.channel?.send(`❌ Stream-Fehler bei **${track.title}**: ${err.message}`), DELETE_ERROR_MS);
            }
        }, 0, localFile);
        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        queue._resource = resource;
        queue.player.play(resource);
        updateActivity(guildId);

        // Naechsten Track im Hintergrund vorladen (macht /skip nahezu sofort)
        setTimeout(() => prefetchNext(guildId), 1500);

        // Erst "Lädt…"-Platzhalter senden; der Playing-Handler ersetzt ihn durch
        // das volle Embed, sobald die Wiedergabe tatsächlich startet.
        if (queue.channel) {
            queue._npLoading = true;
            // Kurz aufs quadratische Cover warten (max 2.5s), damit Platzhalter und
            // volles Embed dasselbe Bild in derselben Groesse zeigen.
            Promise.race([queue._artPromise, new Promise(r => setTimeout(r, 2500))])
                .then(() => {
                    if (queue.current !== track) return; // Track wurde schon gewechselt
                    return queue.channel.send({ embeds: [buildLoadingEmbed(track, client, guildLocaleFor(queue.guildId))] })
                        .then(msg => {
                            queue._nowPlayingMsg = msg;
                            // Falls der Song beim Ankommen der Nachricht schon läuft: sofort umschalten
                            if (!queue._npLoading) updateNowPlayingMsg(queue);
                        });
                })
                .catch(e => console.error('Now-Playing-Embed konnte nicht gesendet werden:', e?.message || e));
        } else {
            console.error('Now-Playing: queue.channel ist nicht gesetzt – kein Embed gesendet');
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

// "Now Playing"-Nachricht nicht sofort löschen, sondern erst nach 24h entfernen.
// (Löst queue._nowPlayingMsg ab und lässt die alte Nachricht stehen.)
function releaseNowPlaying(queue) {
    const msg = queue._nowPlayingMsg;
    queue._nowPlayingMsg = null;
    if (msg) setTimeout(() => msg.delete().catch(() => {}), DELETE_NOWPLAYING_MS);
}

// Aktuellen Song mit dem gesetzten queue.filter/queue.eqBands ab der aktuellen
// Position neu streamen. Wird vom /filter-Command UND vom Web-App-API-Handler
// genutzt, damit der Filter auf BEIDEN Wegen sofort auf den laufenden Track wirkt.
// (Vorher hat nur der Command neu gestreamt; die API setzte bloss queue.filter,
// sodass der Filter im Web-Player erst beim naechsten Song hoerbar wurde.)
// queue.filter muss vor dem Aufruf gesetzt sein. Gibt false zurueck, wenn nichts
// laeuft (dann bleibt der Filter fuer den naechsten Song gesetzt).
function restartCurrentWithFilter(queue) {
    if (!queue?.current || !queue.player) return false;
    const elapsed = getElapsed(queue);
    for (const proc of queue.processes) {
        if (!proc.killed) proc.kill();
    }
    queue.processes.clear();

    const stream = createStream(queue.current.url, queue, (err) => {
        if (queue.channel) autoDelete(queue.channel.send(`❌ Filter-Fehler: ${err.message}`), DELETE_ERROR_MS);
    }, elapsed);

    const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
    resource.volume.setVolume(queue.volume);
    queue._resource = resource;
    queue.player.play(resource);
    queue._playbackStart = Date.now();
    queue._seekOffset = elapsed;

    updateNowPlayingMsg(queue);
    return true;
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
    db, queues, getQueue, destroyQueue, searchTrack, searchTracks, searchEnhanced, preResolveTrack, spotifyFetch, searchPlaylist, isPlaylistUrl, fetchPlaylistMeta, resolvePlaylistInBackground, fetchSpotifyEmbed,
    playNext, joinChannel, ensureConnection, scheduleLeave, autoDelete, createStream, ffmpegPath,
    prefetchNext, ensureAlbumArt, releaseNowPlaying, restartCurrentWithFilter,
    AudioPlayerStatus, VoiceConnectionStatus, StreamType,
    DELETE_SHORT_MS, DELETE_EMBED_MS, DELETE_ERROR_MS,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    parseDuration, getElapsed, createProgressBar, formatDuration, createPlayerButtons, buildNowPlayingEmbed, updateNowPlayingMsg,
};

// ── i18n: t + Locale-Aufloesung ───────────────────────────────────
// Sprache pro Server: explizite Einstellung (guild_settings.language) >
// Server-Locale (guildLocale) > User-Locale (interaction.locale) > 'de'.
ctx.t = t;
ctx.localeFor = (interaction) => {
    const stored = interaction.guildId ? db.getGuildSettings(interaction.guildId).language : null;
    if (stored === 'de' || stored === 'en') return stored;
    return normalizeLocale(interaction.guildLocale) || normalizeLocale(interaction.locale) || 'de';
};
// Fuer geteilte/persistente Nachrichten ohne Interaction (Now-Playing-Embed):
// nur die Server-Einstellung, sonst Default 'de'.
ctx.localeForGuild = (guildId) => {
    const stored = guildId ? db.getGuildSettings(guildId).language : null;
    return (stored === 'de' || stored === 'en') ? stored : 'de';
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
    const loc = ctx.localeFor(interaction);
    if (!queue || !queue.current) {
        return interaction.reply({ content: t('checks.nothingPlaying', loc), ephemeral: true });
    }

    // Prüfen ob User im Voice Channel ist
    if (!interaction.member.voice.channel) {
        return interaction.reply({ content: t('buttons.mustBeInVoice', loc), ephemeral: true });
    }

    switch (interaction.customId) {
        case 'music_pause':
            if (queue.player.state.status === AudioPlayerStatus.Paused) {
                queue._playbackStart = Date.now() - (queue._pausedElapsed || 0) * 1000;
                queue.player.unpause();
            } else {
                queue._pausedElapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
                queue.player.pause();
            }
            await interaction.deferUpdate();
            updateNowPlayingMsg(queue);
            break;

        case 'music_skip':
            await interaction.deferUpdate();
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.player.stop();
            break;

        case 'music_stop':
            await interaction.deferUpdate();
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.tracks = [];
            queue.current = null;
            queue._failedTrack = null;
            queue.stopped = true;
            releaseNowPlaying(queue);
            if (queue.player) queue.player.stop(true);
            scheduleLeave(interaction.guildId);
            break;

        case 'music_shuffle':
            if (queue.tracks.length < 2) {
                return interaction.reply({ content: t('buttons.notEnoughToShuffle', loc), ephemeral: true });
            }
            for (let i = queue.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
            }
            await interaction.deferUpdate();
            updateNowPlayingMsg(queue);
            break;

        case 'music_loop': {
            const modes = ['off', 'song', 'queue'];
            const idx = (modes.indexOf(queue.loopMode) + 1) % modes.length;
            queue.loopMode = modes[idx];
            await interaction.deferUpdate();
            updateNowPlayingMsg(queue);
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
        const reply = { content: t('error.commandFailed', ctx.localeFor(interaction)), ephemeral: true };
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
        if (queue._playbackStart) {
            queue._pausedElapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
        }
        queue.player.pause();
        queue._autoPaused = true;
        updateNowPlayingMsg(queue);
    } else if (members > 0 && queue._autoPaused) {
        queue._playbackStart = Date.now() - (queue._pausedElapsed || 0) * 1000;
        queue.player.unpause();
        queue._autoPaused = false;
        updateNowPlayingMsg(queue);
    }

    // Allein im Channel: nach LEAVE_TIMEOUT_MS disconnecten (nicht nur pausieren).
    // Kommt vorher jemand zurueck, wird der Timer abgebrochen.
    if (members === 0) {
        if (!queue._aloneTimer) {
            queue._aloneTimer = setTimeout(() => {
                const q = queues.get(guildId);
                if (!q) return;
                q._aloneTimer = null;
                const chId = q.connection?.joinConfig?.channelId;
                const ch = chId ? newState.guild.channels.cache.get(chId) : null;
                const stillAlone = !ch || ch.members.filter(m => !m.user.bot).size === 0;
                if (stillAlone) destroyQueue(guildId);
            }, LEAVE_TIMEOUT_MS);
        }
    } else if (queue._aloneTimer) {
        clearTimeout(queue._aloneTimer);
        queue._aloneTimer = null;
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
    notifyError('BeatByte', 'unhandledRejection', err);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err?.message || err);
    notifyError('BeatByte', 'uncaughtException', err);
});

// ── Discord Reconnect & Error Handling ──────────────────────────
client.on('error', (err) => {
    console.error('Discord client error:', err.message);
    notifyError('BeatByte', 'Discord client error', err);
});
client.on('warn', (msg) => {
    console.warn('Discord warning:', msg);
});

// ── Bot starten ───────────────────────────────────────────────────
client.once('ready', () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    notifyOnline('BeatByte', `als ${client.user.tag} · ${client.guilds.cache.size} Server`);
    client.user.setActivity('/play', { type: ActivityType.Listening });
    const api = startAPI(ctx, client);
    _apiBroadcast = api.broadcast;
    _apiGetGuildState = api.getGuildState;
    _generateAccessCode = api.generateAccessCode;

    // Periodischer #status-Post (No-op ohne STATUS_CHANNEL_ID)
    startStatusUpdater({
        client,
        botName: 'BeatByte',
        emoji: '🎵',
        getState: () => ({
            online: true,
            guilds: client.guilds.cache.size,
            extra: {
                'Aktive Wiedergaben': [...queues.values()].filter(q => q.current).length,
                'Web-API': `Port ${process.env.API_PORT || 3001} ✓`,
            },
        }),
    });
});

db.init().then(() => {
    console.log('📦 Datenbank initialisiert');
    client.login(process.env.DISCORD_TOKEN);
}).catch(err => {
    console.error('❌ Datenbank-Fehler:', err.message);
    process.exit(1);
});

// Nur fuer den lokalen Dev-Test-Runner: gibt Zugriff auf client + ctx.
// In Prod ist index.js der Entrypoint und wird nie require()d -> ohne Wirkung.
module.exports = { client, ctx };

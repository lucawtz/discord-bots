import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_URL = window.location.origin !== 'null' && !window.location.origin.startsWith('tauri')
  ? window.location.origin
  : 'http://localhost:3001';

function fmtTime(s) {
  if (!s || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// ── Icons ─────────────────────────────────────────────────────────
const Icons = {
  equalizer: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 12h2v4H3zm4-3h2v10H7zm4-4h2v18h-2zm4 7h2v6h-2zm4-2h2v10h-2z"/></svg>,
  home: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  library: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>,
  heart: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
  heartOutline: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>,
  heartFilled: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
  playlist: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>,
  search: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  play: <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>,
  pause: <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  skip: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>,
  shuffle: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>,
  stop: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>,
  volume: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>,
  add: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  headphones: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>,
  delete: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  music: <svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" opacity="0.3"/></svg>,
  lyrics: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>,
  dj: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>,
  playSmall: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>,
  user: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  settings: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>,
  logoutIcon: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>,
  fire: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>,
  refresh: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>,
};

function App() {
  const [botUrl, setBotUrl] = useState(localStorage.getItem('botUrl') || DEFAULT_URL);
  const [accessCode, setAccessCode] = useState('');
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [guild, setGuild] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [initializing, setInitializing] = useState(!!localStorage.getItem('authToken'));
  const [state, setState] = useState({ current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const [channels, setChannels] = useState([]);
  const [joiningChannel, setJoiningChannel] = useState(null);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [pendingTrack, setPendingTrack] = useState(null);
  const [error, setError] = useState('');
  const [localElapsed, setLocalElapsed] = useState(0);
  const [localVolume, setLocalVolume] = useState(100);
  const volumeTimerRef = useRef(null);
  const [playlists, setPlaylists] = useState([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const [settingsTab, setSettingsTab] = useState('overview');
  const [eqValues, setEqValues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eqValues')) || [0,0,0,0,0,0,0]; } catch { return [0,0,0,0,0,0,0]; }
  });
  const [libraryTab, setLibraryTab] = useState('queue');
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // New state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [oauthGuilds, setOauthGuilds] = useState(null);
  const [oauthUser, setOauthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('discordUser')); } catch { return null; }
  });
  const [oauthToken, setOauthToken] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Dynamic homepage content
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [recommendedData, setRecommendedData] = useState({ forYou: [], becauseYouListened: null });
  const [popularOnServer, setPopularOnServer] = useState([]);
  const [globalPopular, setGlobalPopular] = useState([]);
  const [popularArtists, setPopularArtists] = useState([]);
  const [genreSections, setGenreSections] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState('all');

  // Auto-detect country from browser for local trends
  const detectedCountry = (() => {
    const locale = navigator.language || '';
    const country = locale.split('-')[1]?.toUpperCase() || locale.split('-')[0]?.toUpperCase();
    const countries = {
      DE: { code: 'DE', name: 'Deutschland' }, AT: { code: 'AT', name: 'Österreich' }, CH: { code: 'CH', name: 'Schweiz' },
      US: { code: 'US', name: 'USA' }, GB: { code: 'GB', name: 'UK' }, FR: { code: 'FR', name: 'Frankreich' },
      ES: { code: 'ES', name: 'Spanien' }, IT: { code: 'IT', name: 'Italien' }, NL: { code: 'NL', name: 'Niederlande' },
      TR: { code: 'TR', name: 'Türkei' }, PL: { code: 'PL', name: 'Polen' }, SE: { code: 'SE', name: 'Schweden' },
      BR: { code: 'BR', name: 'Brasilien' }, MX: { code: 'MX', name: 'Mexiko' }, JP: { code: 'JP', name: 'Japan' },
      KR: { code: 'KR', name: 'Südkorea' },
    };
    return countries[country] || countries.DE;
  })();

  const filterGenres = [
    { id: 'all', label: 'Alle' },
    { id: 'pop', label: 'Pop' },
    { id: 'hiphop', label: 'Hip-Hop' },
    { id: 'rnb', label: 'R&B' },
    { id: 'rock', label: 'Rock' },
    { id: 'electronic', label: 'Electronic' },
    { id: 'latin', label: 'Latin' },
    { id: 'kpop', label: 'K-Pop' },
  ];
  const [likedSongs, setLikedSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('likedSongs') || '[]'); } catch { return []; }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'); } catch { return []; }
  });
  const likeSyncRef = useRef(false);

  const wsRef = useRef(null);
  const guildRef = useRef(null);
  const prevTrackRef = useRef(null);

  useEffect(() => { guildRef.current = guild; }, [guild]);

  // Sync liked songs & history from server when connected
  useEffect(() => {
    if (!connected || !guild || !token) return;
    const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    // Fetch server likes
    (async () => {
      try {
        const res = await fetch(`${botUrl}/api/guild/${guild.id}/likes`, { headers: h });
        if (res.ok) {
          const serverLikes = await res.json();
          const mapped = serverLikes.map(t => ({
            title: t.track_title, url: t.track_url, artist: t.artist,
            thumbnail: t.thumbnail, duration: t.duration, likedAt: new Date(t.liked_at).getTime(),
          }));
          // Merge: server is source of truth, but add any localStorage-only likes to server
          const localLikes = JSON.parse(localStorage.getItem('likedSongs') || '[]');
          const serverUrls = new Set(mapped.map(t => t.url));
          const localOnly = localLikes.filter(t => !serverUrls.has(t.url));
          // Upload local-only likes to server
          for (const t of localOnly) {
            try {
              await fetch(`${botUrl}/api/guild/${guild.id}/likes`, {
                method: 'POST', headers: h,
                body: JSON.stringify({ title: t.title, url: t.url, artist: t.artist, thumbnail: t.thumbnail, duration: t.duration }),
              });
            } catch {}
          }
          const merged = [...mapped, ...localOnly];
          merged.sort((a, b) => b.likedAt - a.likedAt);
          setLikedSongs(merged);
          localStorage.setItem('likedSongs', JSON.stringify(merged));
          likeSyncRef.current = true;
        }
      } catch {}
    })();
    // Fetch server history
    (async () => {
      try {
        const res = await fetch(`${botUrl}/api/guild/${guild.id}/history?limit=20`, { headers: h });
        if (res.ok) {
          const serverHistory = await res.json();
          if (serverHistory.length > 0) {
            const mapped = serverHistory.map(t => ({
              title: t.track_title, url: t.track_url, artist: t.artist,
              thumbnail: t.thumbnail, duration: t.duration, playedAt: new Date(t.played_at).getTime(),
            }));
            setRecentlyPlayed(mapped);
            localStorage.setItem('recentlyPlayed', JSON.stringify(mapped));
          }
        }
      } catch {}
    })();
    // Fetch user settings (EQ)
    (async () => {
      try {
        const res = await fetch(`${botUrl}/api/user/settings`, { headers: h });
        if (res.ok) {
          const settings = await res.json();
          if (settings.eq_values && Array.isArray(settings.eq_values)) {
            setEqValues(settings.eq_values);
            localStorage.setItem('eqValues', JSON.stringify(settings.eq_values));
          }
        }
      } catch {}
    })();
  }, [connected, guild, token]);

  // Track recently played — save to server too
  useEffect(() => {
    if (state.current && state.current.url !== prevTrackRef.current) {
      prevTrackRef.current = state.current.url;
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.url !== state.current.url);
        const updated = [{ ...state.current, playedAt: Date.now() }, ...filtered].slice(0, 20);
        localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
        return updated;
      });
    }
  }, [state.current]);

  // Persist liked songs to localStorage
  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  const toggleLike = (track) => {
    const alreadyLiked = likedSongs.find(t => t.url === track.url);
    setLikedSongs(prev => {
      if (alreadyLiked) return prev.filter(t => t.url !== track.url);
      return [...prev, { ...track, likedAt: Date.now() }];
    });
    // Sync to server
    if (guild && token) {
      const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (alreadyLiked) {
        fetch(`${botUrl}/api/guild/${guild.id}/likes/${encodeURIComponent(track.url)}`, { method: 'DELETE', headers: h }).catch(() => {});
      } else {
        fetch(`${botUrl}/api/guild/${guild.id}/likes`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ title: track.title, url: track.url, artist: track.artist, thumbnail: track.thumbnail, duration: track.duration }),
        }).catch(() => {});
      }
    }
  };

  const isLiked = (url) => likedSongs.some(t => t.url === url);

  // Client-side elapsed timer
  useEffect(() => {
    if (!state.current || state.paused) {
      setLocalElapsed(state.elapsed || 0);
      return;
    }
    setLocalElapsed(state.elapsed || 0);
    const interval = setInterval(() => setLocalElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [state.current, state.paused, state.elapsed]);

  const getHeaders = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchState = useCallback(async (guildId) => {
    if (!guildId) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${guildId}/state`, { headers: getHeaders() });
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        const s = await res.json();
        setState(s);
        if (!volumeTimerRef.current) setLocalVolume(s.volume ?? 100);
      }
    } catch {}
  }, [botUrl, getHeaders]);

  // Auto-reconnect or handle Discord OAuth callback
  useEffect(() => {
    // Check for Discord OAuth callback
    const params = new URLSearchParams(window.location.search);
    const discordToken = params.get('discord_token');
    const oauthError = params.get('error');

    if (oauthError) {
      const msgs = { discord_denied: 'Discord Login abgebrochen.', no_shared_guilds: 'Kein gemeinsamer Server mit dem Bot gefunden.', invalid_state: 'Ungültiger Login-Versuch.', oauth_failed: 'Discord Login fehlgeschlagen.' };
      setError(msgs[oauthError] || 'Login fehlgeschlagen.');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (discordToken) {
      window.history.replaceState({}, '', window.location.pathname);
      // Fetch shared guilds
      (async () => {
        try {
          const res = await fetch(`${botUrl}/api/auth/discord/guilds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oauthToken: discordToken }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setOauthToken(discordToken);
          setOauthUser(data.user);
          localStorage.setItem('discordUser', JSON.stringify(data.user));
          setOauthGuilds(data.guilds);
          // If only one guild, auto-select
          if (data.guilds.length === 1) {
            selectOauthGuild(discordToken, data.guilds[0].id);
          }
        } catch (err) { setError(err.message); }
      })();
      return;
    }

    if (!token) { setInitializing(false); return; }
    const verify = async () => {
      try {
        const res = await fetch(`${botUrl}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.guild) {
            setGuild(data.guild);
            setConnected(true);
            if (data.userId) {
              const user = { id: data.userId, username: data.username, global_name: data.global_name, avatar: data.avatar };
              setOauthUser(user);
              localStorage.setItem('discordUser', JSON.stringify(user));
            }
            connectWebSocket(token);
          } else { logout(); }
        } else { logout(); }
      } catch { logout(); }
      setInitializing(false);
    };
    verify();
  }, []);

  const selectOauthGuild = async (discordOauthToken, guildId) => {
    try {
      const res = await fetch(`${botUrl}/api/auth/discord/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oauthToken: discordOauthToken, guildId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setGuild(data.guild);
      setConnected(true);
      setOauthGuilds(null);
      // Keep oauthUser for profile display
      setOauthToken(null);
      localStorage.setItem('botUrl', botUrl);
      localStorage.setItem('authToken', data.token);
      connectWebSocket(data.token);
    } catch (err) { setError(err.message); }
  };

  const loginWithDiscord = () => {
    window.location.href = `${botUrl}/api/auth/discord`;
  };

  const connectWebSocket = (authToken) => {
    wsRef.current?.close();
    const wsUrl = botUrl.replace(/^http/, 'ws') + '/api/ws';
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token: authToken }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === 'stateUpdate' && msg.data?.guildId === guildRef.current?.id) setState(msg.data);
      } catch {}
    };
    ws.onclose = () => {};
    wsRef.current = ws;
  };

  const connect = async () => {
    setError('');
    setConnecting(true);
    try {
      const res = await fetch(`${botUrl}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setGuild(data.guild);
      setConnected(true);
      localStorage.setItem('botUrl', botUrl);
      localStorage.setItem('authToken', data.token);
      connectWebSocket(data.token);
    } catch (err) { setError(err.message); }
    setConnecting(false);
  };

  const logout = () => {
    if (token) {
      fetch(`${botUrl}/api/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => {});
    }
    wsRef.current?.close();
    setConnected(false);
    setToken('');
    setGuild(null);
    setAccessCode('');
    setOauthUser(null);
    setState({ current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 });
    localStorage.removeItem('authToken');
    localStorage.removeItem('discordUser');
  };

  useEffect(() => {
    if (!connected || !guild) return;
    fetchState(guild.id);
    // Poll less aggressively — WebSocket handles real-time updates
    const interval = setInterval(() => fetchState(guild.id), 10000);
    return () => clearInterval(interval);
  }, [connected, guild, fetchState]);

  useEffect(() => {
    if (!connected || !guild) { setChannels([]); return; }
    (async () => {
      try {
        const res = await fetch(`${botUrl}/api/guild/${guild.id}/channels`, { headers: getHeaders() });
        if (res.ok) setChannels(await res.json());
      } catch {}
    })();
  }, [connected, guild, botUrl, getHeaders]);

  const [searchArtists, setSearchArtists] = useState([]);
  const [searchAlbums, setSearchAlbums] = useState([]);
  const searchTimerRef = useRef(null);
  const searchVersionRef = useRef(0);

  const search = async (query) => {
    const q = query !== undefined ? query : searchQuery;
    if (!q.trim()) { setSearchResults([]); setSearchArtists([]); setSearchAlbums([]); return; }
    const version = ++searchVersionRef.current;
    setSearching(true); setError('');
    setActiveView('search');
    try {
      // Phase 1: Quick track search (single API call, fast)
      const res = await fetch(`${botUrl}/api/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
      if (searchVersionRef.current !== version) return; // stale, newer search started
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data);
      setSearching(false);

      // Phase 2: Load artists + albums in background (non-blocking)
      fetch(`${botUrl}/api/search?q=${encodeURIComponent(q)}&enhanced=1`, { headers: getHeaders() })
        .then(r => r.json())
        .then(full => {
          if (searchVersionRef.current !== version) return; // stale
          if (full.artists) setSearchArtists(full.artists);
          if (full.albums) setSearchAlbums(full.albums);
          if (full.tracks) setSearchResults(full.tracks);
        }).catch(() => {});
    } catch (err) { if (searchVersionRef.current === version) { setError(err.message); setSearching(false); } }
  };

  // Live search with debounce
  const onSearchInput = (value) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults([]); setSearchArtists([]); setSearchAlbums([]);
      if (activeView === 'search') setActiveView('home');
      return;
    }
    searchTimerRef.current = setTimeout(() => search(value), 200);
  };

  const addToQueue = async (track) => {
    if (!guild) return;
    // If bot not in a voice channel, show channel picker
    if (!state.connected) {
      setPendingTrack(track);
      setShowChannelPicker(true);
      return;
    }
    setAdding(track.url);
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/play`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ query: track.url, immediate: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchState(guild.id);
    } catch (err) { setError(err.message); }
    setAdding(null);
  };

  const joinAndPlay = async (channelId) => {
    setJoiningChannel(channelId);
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/join`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ channelId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState(guild.id);
      setShowChannelPicker(false);
      // Play the pending track after joining
      if (pendingTrack) {
        setAdding(pendingTrack.url);
        try {
          const playRes = await fetch(`${botUrl}/api/guild/${guild.id}/play`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ query: pendingTrack.url, immediate: true }) });
          const playData = await playRes.json();
          if (!playRes.ok) throw new Error(playData.error);
          fetchState(guild.id);
        } catch (err) { setError(err.message); }
        setAdding(null);
        setPendingTrack(null);
      }
    } catch (err) { setError(err.message); }
    setJoiningChannel(null);
  };

  const apiAction = async (action, body) => {
    if (!guild) return;
    try {
      const opts = { method: 'POST', headers: getHeaders() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/${action}`, opts);
      if (res.status === 401) { logout(); return; }
      if (res.ok) fetchState(guild.id);
    } catch {}
  };

  const removeFromQueue = async (index) => {
    if (!guild) return;
    try {
      await fetch(`${botUrl}/api/guild/${guild.id}/queue/${index}`, { method: 'DELETE', headers: getHeaders() });
      fetchState(guild.id);
    } catch {}
  };

  const clearQueue = async () => {
    if (!guild) return;
    try {
      await fetch(`${botUrl}/api/guild/${guild.id}/queue`, { method: 'DELETE', headers: getHeaders() });
      fetchState(guild.id);
    } catch {}
  };

  const fetchPlaylists = useCallback(async () => {
    if (!guild) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/playlists`, { headers: getHeaders() });
      if (res.ok) setPlaylists(await res.json());
    } catch {}
  }, [guild, botUrl, getHeaders]);

  useEffect(() => {
    if (connected && guild) fetchPlaylists();
  }, [connected, guild, fetchPlaylists]);

  const savePlaylist = async () => {
    if (!guild || !playlistName.trim()) return;
    setSavingPlaylist(true);
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/playlists`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ name: playlistName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setPlaylistName('');
      setShowSaveInput(false);
      fetchPlaylists();
    } catch (err) { setError(err.message); }
    setSavingPlaylist(false);
  };

  const openPlaylistDetail = async (playlistId) => {
    if (!guild) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/playlists/${playlistId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Playlist nicht gefunden');
      const data = await res.json();
      setOpenPlaylist(data);
      setActiveView('playlist-detail');
    } catch (err) { setError(err.message); }
  };

  const loadPlaylist = async (playlistId) => {
    if (!guild) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/playlists/${playlistId}/load`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchState(guild.id);
    } catch (err) { setError(err.message); }
  };

  const deletePlaylist = async (playlistId) => {
    if (!guild) return;
    try {
      await fetch(`${botUrl}/api/guild/${guild.id}/playlists/${playlistId}`, { method: 'DELETE', headers: getHeaders() });
      fetchPlaylists();
    } catch {}
  };

  const moveQueueItem = async (from, to) => {
    if (!guild || from === to) return;
    try {
      await fetch(`${botUrl}/api/guild/${guild.id}/queue/move`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ from, to }),
      });
      fetchState(guild.id);
    } catch {}
  };

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(searchTimerRef.current);
      clearTimeout(eqTimerRef.current);
      clearTimeout(eqSaveTimerRef.current);
      clearTimeout(volumeTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch dynamic homepage content — cached in sessionStorage
  const discoverVersionRef = useRef(0);

  const fetchHomepageContent = useCallback(async (genre = 'all', force = false) => {
    if (!connected || !guild) return;
    const version = ++discoverVersionRef.current;

    const filterParams = genre !== 'all' ? `&genre=${genre}` : '';
    const cacheKey = `discover_${guild.id}_${genre}_${detectedCountry.code}`;

    if (!force) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey));
        if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
          if (cached.trending) setTrendingTracks(cached.trending);
          if (cached.releases) setNewReleases(cached.releases);
          if (cached.recs) setRecommendedData(cached.recs);
          if (cached.serverPop) setPopularOnServer(cached.serverPop);
          if (cached.globalPop) setGlobalPopular(cached.globalPop);
          if (cached.artists) setPopularArtists(cached.artists);
          if (cached.sections) setGenreSections(cached.sections);
          if (cached.localTrending) setLocalTracks(cached.localTrending);
          return;
        }
      } catch {}
    }

    setHomeLoading(true);
    const h = getHeaders();
    const fetchJson = async (url) => {
      try { const r = await fetch(url, { headers: h }); if (r.ok) return await r.json(); } catch {} return null;
    };

    const [trending, localTrending, releases, serverPop] = await Promise.all([
      fetchJson(`${botUrl}/api/discover/trending?x=1${filterParams}`),
      fetchJson(`${botUrl}/api/discover/local-charts?country=${detectedCountry.code}`),
      fetchJson(`${botUrl}/api/discover/new-releases?x=1${filterParams}`),
      fetchJson(`${botUrl}/api/guild/${guild.id}/discover/popular`),
    ]);

    if (discoverVersionRef.current !== version) { setHomeLoading(false); return; }
    if (trending) setTrendingTracks(trending);
    if (localTrending) setLocalTracks(localTrending);
    if (releases) setNewReleases(releases);
    if (serverPop) setPopularOnServer(serverPop);

    const [recs, globalPop, artists, sections] = await Promise.all([
      fetchJson(`${botUrl}/api/guild/${guild.id}/discover/recommendations`),
      fetchJson(`${botUrl}/api/discover/global-popular`),
      fetchJson(`${botUrl}/api/discover/popular-artists?x=1${filterParams}`),
      fetchJson(`${botUrl}/api/discover/sections?x=1${filterParams}`),
    ]);

    if (discoverVersionRef.current !== version) { setHomeLoading(false); return; }
    if (recs) setRecommendedData(recs);
    if (globalPop) setGlobalPopular(globalPop);
    if (artists) setPopularArtists(artists);
    if (sections) setGenreSections(sections);

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        ts: Date.now(), trending, localTrending, releases, recs, serverPop, globalPop, artists, sections,
      }));
    } catch {}

    setHomeLoading(false);
  }, [connected, guild, botUrl, getHeaders]);

  useEffect(() => {
    if (!connected || !guild) return;
    fetchHomepageContent(activeGenre, true);
  }, [connected, guild, activeGenre]);

  const totalDuration = state.current ? parseDuration(state.current.duration) : 0;
  const progress = totalDuration > 0 ? Math.min((localElapsed / totalDuration) * 100, 100) : 0;
  const loopIcons = { off: 'Off', song: 'Song', queue: 'Queue' };

  // Audio filter helpers (must be before conditional returns)
  const activeFilter = state.filter || 'off';
  const eqTimerRef = useRef(null);
  const eqSaveTimerRef = useRef(null);

  // Save EQ to user settings on server (debounced)
  const syncEqToServer = (values) => {
    if (!token) return;
    clearTimeout(eqSaveTimerRef.current);
    eqSaveTimerRef.current = setTimeout(() => {
      fetch(`${botUrl}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eq_values: values }),
      }).catch(() => {});
    }, 1000);
  };

  const sendEqToBackend = (bands) => {
    if (!guild) return;
    clearTimeout(eqTimerRef.current);
    eqTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${botUrl}/api/guild/${guild.id}/filter`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify({ filter: 'custom', eqBands: bands }),
        });
        fetchState(guild.id);
      } catch {}
    }, 500);
  };

  const setFilter = async (filter) => {
    if (!guild) return;
    clearTimeout(eqTimerRef.current);
    // Update EQ sliders to match preset
    const preset = filterPresets.find(p => p.id === filter);
    if (preset?.eq) {
      setEqValues(preset.eq);
      localStorage.setItem('eqValues', JSON.stringify(preset.eq));
      syncEqToServer(preset.eq);
    }
    try {
      await fetch(`${botUrl}/api/guild/${guild.id}/filter`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ filter }),
      });
      fetchState(guild.id);
    } catch {}
  };
  const filterPresets = [
    { id: 'off', label: 'Aus', desc: 'Kein Filter', icon: '—', eq: [0,0,0,0,0,0,0] },
    { id: 'bassboost', label: 'Bass Boost', desc: 'Verstärkter Bass', icon: '🔊', eq: [10,8,4,0,-2,-3,-2] },
    { id: 'nightcore', label: 'Nightcore', desc: 'Schneller + höher', icon: '⚡', eq: [-2,0,2,4,6,5,3] },
    { id: 'slowed', label: 'Slowed', desc: 'Langsamer + tiefer', icon: '🌙', eq: [4,3,1,-1,-3,-2,0] },
  ];
  const eqBands = [
    { freq: '60', label: 'Sub' },
    { freq: '150', label: 'Bass' },
    { freq: '400', label: 'Low' },
    { freq: '1k', label: 'Mid' },
    { freq: '2.5k', label: 'High' },
    { freq: '6k', label: 'Pres' },
    { freq: '16k', label: 'Air' },
  ];

  // ── Setup Screen ───────────────────────────────────────────────
  // Skeleton while verifying existing token
  if (initializing) {
    return (
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-top"><div className="sidebar-brand"><img src="https://cdn.discordapp.com/avatars/1488919318472298647/4764a9259454d44d47e75034c1f9c03b.png?size=128" alt="BeatByte" className="brand-logo" /><span className="brand-text">BeatByte</span></div></div>
          <nav className="sidebar-nav">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-line" style={{ height: 36, margin: '2px 8px', borderRadius: 8 }} />)}
          </nav>
        </aside>
        <main className="main">
          <header className="top-bar"><div className="skeleton-line" style={{ height: 42, borderRadius: 999, flex: 1 }} /></header>
          <div className="content">
            <div className="skeleton-line" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton-line" style={{ height: 48, borderRadius: 6 }} />)}
            </div>
            <div className="skeleton-line" style={{ height: 200, borderRadius: 12, marginBottom: 28 }} />
            <div className="skeleton-line" style={{ height: 20, width: 150, borderRadius: 8, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 16 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton-line" style={{ width: 160, height: 200, borderRadius: 8, flexShrink: 0 }} />)}
            </div>
          </div>
        </main>
        <footer className="player-bar"><div className="player-empty" /></footer>
      </div>
    );
  }

  if (!connected) {
    // Guild selection after Discord OAuth
    if (oauthGuilds && oauthGuilds.length > 1) {
      return (
        <div className="setup">
          <div className="setup-card">
            <div className="setup-logo">
              <img src="https://cdn.discordapp.com/avatars/1488919318472298647/4764a9259454d44d47e75034c1f9c03b.png?size=128" alt="BeatByte" className="setup-logo-icon" />
            </div>
            <h1>Server wählen</h1>
            {oauthUser && <p className="setup-subtitle">Eingeloggt als {oauthUser.username}</p>}
            <div className="guild-select-list">
              {oauthGuilds.map(g => (
                <button key={g.id} className="guild-select-item" onClick={() => selectOauthGuild(oauthToken, g.id)}>
                  {g.icon ? <img src={g.icon} alt="" className="guild-icon" /> : <div className="guild-placeholder">{g.name[0]}</div>}
                  <span className="guild-name">{g.name}</span>
                  <span className="guild-select-arrow">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                  </span>
                </button>
              ))}
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="setup">
        <div className="setup-card">
          <div className="setup-logo">
            <img src="https://cdn.discordapp.com/avatars/1488919318472298647/4764a9259454d44d47e75034c1f9c03b.png?size=128" alt="BeatByte" className="setup-logo-icon" />
          </div>
          <h1>BeatByte</h1>
          <p className="setup-subtitle">Steuere deine Musik direkt im Browser</p>

          {/* Discord Login Button */}
          <button className="btn-discord" onClick={loginWithDiscord}>
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Mit Discord anmelden
          </button>

          <div className="setup-divider">
            <span>oder</span>
          </div>

          {/* Code Login */}
          <div className="setup-form">
            <label>Zugangs-Code</label>
            <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="Code eingeben" maxLength={12} className="code-input" onKeyDown={e => e.key === 'Enter' && connect()} />
            <p className="setup-hint">Tippe <code>/app</code> in Discord, um deinen Code zu erhalten.</p>
            <button className="btn-connect" onClick={connect} disabled={connecting || !accessCode.trim()}>
              {connecting ? 'Verbinde...' : 'Verbinden'}
            </button>
            <details className="setup-advanced">
              <summary>Erweitert</summary>
              <label>Server URL</label>
              <input value={botUrl} onChange={e => setBotUrl(e.target.value)} placeholder="http://localhost:3001" />
            </details>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Track Card Component ───────────────────────────────────────
  const TrackCard = ({ track, showArtist = true }) => (
    <div className="track-card" onClick={() => addToQueue(track)}>
      <div className="track-card-cover">
        {track.thumbnail ? <img src={track.thumbnail} alt="" /> : <div className="track-card-empty" />}
        <div className="track-card-play">{Icons.playSmall}</div>
      </div>
      <div className="track-card-title">{track.title}</div>
      {showArtist && track.artist && <div className="track-card-artist">{track.artist}</div>}
    </div>
  );

  // ── Track Row Component ────────────────────────────────────────
  const TrackRow = ({ track, index, showDuration = true, onRemove, draggable: isDraggable }) => (
    <div
      className={`track-row${dragIndex === index ? ' dragging' : ''}${dragOverIndex === index ? ' drag-over' : ''}`}
      draggable={isDraggable}
      onDragStart={isDraggable ? () => setDragIndex(index) : undefined}
      onDragOver={isDraggable ? e => { e.preventDefault(); setDragOverIndex(index); } : undefined}
      onDrop={isDraggable ? () => { moveQueueItem(dragIndex, index); setDragIndex(null); setDragOverIndex(null); } : undefined}
      onDragEnd={isDraggable ? () => { setDragIndex(null); setDragOverIndex(null); } : undefined}
    >
      {isDraggable && <span className="track-row-handle">&#8801;</span>}
      {index !== undefined && <span className="track-row-num">{index + 1}</span>}
      <div className="track-row-thumb">
        {track.thumbnail ? <img src={track.thumbnail} alt="" /> : <div className="track-row-thumb-empty" />}
        <button className="track-row-play-overlay" onClick={(e) => { e.stopPropagation(); addToQueue(track); }}>
          {adding === track.url ? <span className="adding-spinner" /> : Icons.playSmall}
        </button>
      </div>
      <div className="track-row-info">
        <span className="track-row-title">{track.title}</span>
        {track.artist && <span className="track-row-artist">{track.artist}</span>}
      </div>
      <button className={`track-row-like${isLiked(track.url) ? ' liked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
        {isLiked(track.url) ? Icons.heartFilled : Icons.heartOutline}
      </button>
      {showDuration && <span className="track-row-duration">{track.duration}</span>}
      {onRemove && <button className="track-row-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>{Icons.close}</button>}
    </div>
  );

  // ── Sidebar Navigation ─────────────────────────────────────────
  const navItems = [
    { id: 'home', icon: Icons.home, label: 'Home' },
    { id: 'library', icon: Icons.library, label: 'Bibliothek' },
    { id: 'liked', icon: Icons.heart, label: 'Liked Songs' },
  ];

  const searchGenre = async (query) => {
    setSearchQuery(query);
    setSearching(true); setSearchResults([]); setError('');
    setActiveView('search');
    try {
      const res = await fetch(`${botUrl}/api/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data);
    } catch (err) { setError(err.message); }
    setSearching(false);
  };

  // ── Featured Cards Component ──────────────────────────────────
  // ── Artist Card for homepage ──────────────────────────────────
  const ArtistCard = ({ artist }) => (
    <div className="artist-bubble" onClick={() => searchGenre(artist.name)}>
      <div className="artist-bubble-img">
        {artist.thumbnail ? <img src={artist.thumbnail} alt="" /> : <div className="artist-bubble-placeholder">{artist.name[0]}</div>}
      </div>
      <span className="artist-bubble-name">{artist.name}</span>
    </div>
  );

  // ── Render Views ───────────────────────────────────────────────
  // Time-based greeting
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'Gute Nacht';
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  })();
  const userName = oauthUser?.global_name || oauthUser?.username || null;

  // Quick-access items
  const quickAccess = (() => {
    const items = [];
    if (recentlyPlayed.length > 0) items.push({ icon: Icons.headphones, label: 'Zuletzt gehört', color: 'var(--purple-hover)', onClick: () => { setActiveView('library'); setLibraryTab('recent'); }, thumbnail: recentlyPlayed[0]?.thumbnail });
    if (likedSongs.length > 0) items.push({ icon: Icons.heart, label: 'Liked Songs', color: 'var(--red)', onClick: () => { setActiveView('liked'); } });
    return items;
  })();

  const renderHome = () => (
    <>
      {/* ── 1. Greeting + Quick Access ──────────────────── */}
      <section className="content-section greeting-section">
        <h1 className="greeting-title">{greeting}{userName ? `, ${userName}` : ''}</h1>
      </section>

      {quickAccess.length > 0 && (
        <section className="content-section">
          <div className="quick-grid">
            {quickAccess.map((item, i) => (
              <button key={i} className="quick-tile" onClick={item.onClick}>
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="quick-tile-img" />
                ) : (
                  <div className="quick-tile-icon" style={{ background: item.color }}>{item.icon}</div>
                )}
                <span className="quick-tile-label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 2. Now Playing ──────────────────────────────── */}
      {state.current && (
        <section className="content-section">
          <div className="now-playing-hero">
            <div className="np-hero-art">
              {(state.current.albumArt || state.current.thumbnail) && <img src={state.current.albumArt || state.current.thumbnail} alt="" />}
              <div className="np-hero-visualizer">
                {!state.paused && <><span className="np-bar" /><span className="np-bar" /><span className="np-bar" /><span className="np-bar" /></>}
              </div>
            </div>
            <div className="np-hero-info">
              <span className="np-hero-title">{state.current.title}</span>
              {state.current.artist && <span className="np-hero-artist">{state.current.artist}</span>}
              <div className="np-progress">
                <span className="np-time">{fmtTime(localElapsed)}</span>
                <div className="np-progress-bar"><div className="np-progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="np-time">{state.current.duration}</span>
              </div>
              <div className="np-hero-actions">
                <button className={`np-hero-like${isLiked(state.current.url) ? ' liked' : ''}`} onClick={() => toggleLike(state.current)}>
                  {isLiked(state.current.url) ? Icons.heartFilled : Icons.heartOutline}
                </button>
                <span className="np-hero-meta">{state.current.requestedBy}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Up Next (compact, only if playing) */}
      {state.current && state.tracks.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Up Next <span className="badge">{state.tracks.length}</span></h2>
          <div className="card-scroll">
            {state.tracks.slice(0, 8).map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* Skeleton — reserve layout while loading */}
      {homeLoading && trendingTracks.length === 0 && (
        <div className="home-skeleton">
          {/* Chart Hero skeleton */}
          <div className="skeleton-line" style={{ height: 200, borderRadius: 12, marginBottom: 24 }} />
          {/* Filter chips skeleton */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-line" style={{ width: 70, height: 32, borderRadius: 999 }} />)}
          </div>
          {/* Section title skeleton */}
          <div className="skeleton-line" style={{ width: 160, height: 22, borderRadius: 6, marginBottom: 14 }} />
          {/* Track list skeleton */}
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
              <div className="skeleton-line" style={{ width: 20, height: 14, borderRadius: 4 }} />
              <div className="skeleton-line" style={{ width: 44, height: 44, borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                <div className="skeleton-line" style={{ width: '30%', height: 12, borderRadius: 4 }} />
              </div>
              <div className="skeleton-line" style={{ width: 32, height: 12, borderRadius: 4 }} />
            </div>
          ))}
          {/* Cards row skeleton */}
          <div className="skeleton-line" style={{ width: 140, height: 22, borderRadius: 6, marginTop: 24, marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 16 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ flexShrink: 0 }}>
                <div className="skeleton-line" style={{ width: 160, height: 160, borderRadius: 8, marginBottom: 8 }} />
                <div className="skeleton-line" style={{ width: 120, height: 13, borderRadius: 4, marginBottom: 4 }} />
                <div className="skeleton-line" style={{ width: 80, height: 12, borderRadius: 4 }} />
              </div>
            ))}
          </div>
          {/* Artist bubbles skeleton */}
          <div className="skeleton-line" style={{ width: 130, height: 22, borderRadius: 6, marginTop: 24, marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="skeleton-line" style={{ width: 80, height: 80, borderRadius: '50%' }} />
                <div className="skeleton-line" style={{ width: 60, height: 12, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Charts ───────────────────────────────────── */}
      {/* Hero Banner — #1 Chart Song */}
      {trendingTracks.length > 0 && (
        <section className="content-section">
          <div className="chart-hero" onClick={() => addToQueue(trendingTracks[0])}>
            <div className="chart-hero-bg">
              {trendingTracks[0].thumbnail && <img src={trendingTracks[0].thumbnail} alt="" />}
            </div>
            <div className="chart-hero-overlay" />
            <div className="chart-hero-content">
              <span className="chart-hero-badge">#1 Weltweit</span>
              <span className="chart-hero-title">{trendingTracks[0].title}</span>
              <span className="chart-hero-artist">{trendingTracks[0].artist}</span>
            </div>
            <div className="chart-hero-play">{Icons.play}</div>
          </div>
        </section>
      )}

      {/* Genre Filter */}
      <section className="content-section filter-section">
        <div className="filter-row">
          <div className="filter-group">
            {filterGenres.map(g => (
              <button key={g.id} className={`filter-chip${activeGenre === g.id ? ' active' : ''}`} onClick={() => setActiveGenre(g.id)}>{g.label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Global Charts */}
      {trendingTracks.length > 1 && (
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">{Icons.fire} Globale Charts</h2>
            <button className="btn-refresh" onClick={() => fetchHomepageContent(activeGenre, true)} title="Aktualisieren">{Icons.refresh}</button>
          </div>
          <div className="track-list">
            {trendingTracks.slice(1, 11).map((track, i) => (
              <TrackRow key={i} track={track} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Local Charts */}
      {localTracks.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Charts {detectedCountry.name}</h2>
          <div className="card-scroll">
            {localTracks.map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* ── 4. Für dich ────────────────────────────────── */}
      {!homeLoading && (recommendedData.forYou.length > 0 || recentlyPlayed.length > 0) && (
        <section className="content-section">
          <h2 className="section-title">{Icons.sparkle} Für dich</h2>
          {recommendedData.forYou.length > 0 && (
            <>
              {recommendedData.becauseYouListened && (
                <p className="section-subtitle-block">Weil du {recommendedData.becauseYouListened} gehört hast</p>
              )}
              <div className="card-scroll" style={{ marginBottom: recentlyPlayed.length > 0 ? 20 : 0 }}>
                {recommendedData.forYou.slice(0, 8).map((track, i) => <TrackCard key={i} track={track} />)}
              </div>
            </>
          )}
          {recentlyPlayed.length > 0 && (
            <div className="track-list">
              {recentlyPlayed.slice(0, 5).map((track, i) => (
                <TrackRow key={i} track={track} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 5. Entdecken ────────────────────────────────── */}
      {/* New Releases */}
      {newReleases.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Neu erschienen</h2>
          <div className="card-scroll">
            {newReleases.map((album, i) => (
              <div key={i} className="album-card" onClick={() => searchGenre(`${album.artist} ${album.name}`)}>
                <div className="album-card-cover">
                  {album.image ? <img src={album.image} alt="" /> : <div className="track-card-empty" />}
                  <div className="track-card-play">{Icons.playSmall}</div>
                </div>
                <div className="track-card-title">{album.name}</div>
                <div className="track-card-artist">{album.artist}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular Artists */}
      {popularArtists.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Beliebte Artists</h2>
          <div className="artist-scroll">
            {popularArtists.map((artist, i) => (
              <ArtistCard key={i} artist={{ name: artist.name, thumbnail: artist.image }} />
            ))}
          </div>
        </section>
      )}

      {/* Genre Sections */}
      {genreSections.map((section, si) => (
        <section key={si} className="content-section">
          <h2 className="section-title">{section.title}</h2>
          <div className="card-scroll">
            {section.tracks.map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      ))}

      {/* Import Promo Banner — only show when content is loaded */}
      {!homeLoading && trendingTracks.length > 0 && (
        <section className="content-section">
          <div className="promo-banner" onClick={() => { setActiveView('library'); setLibraryTab('playlists'); }}>
            <div className="promo-banner-glow" />
            <div className="promo-banner-content">
              <div className="promo-banner-logos">
                <svg viewBox="0 0 24 24" width="36" height="36"><path fill="#1ed760" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="var(--text-2)" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                <svg viewBox="0 0 24 24" width="36" height="36"><path fill="#ff0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <h3 className="promo-banner-title">Bring deine Musik mit</h3>
              <p className="promo-banner-sub">Importiere deine Spotify & YouTube Playlists mit einem Klick</p>
              <button className="promo-banner-btn">Jetzt importieren</button>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Community ────────────────────────────────── */}
      {(popularOnServer.length > 0 || globalPopular.length > 0) && (
        <section className="content-section">
          <h2 className="section-title">{Icons.equalizer} Community</h2>
          {popularOnServer.length > 0 && (
            <>
              <h3 className="subsection-title">Beliebt auf {guild?.name || 'deinem Server'}</h3>
              <div className="track-list" style={{ marginBottom: globalPopular.length > 0 ? 20 : 0 }}>
                {popularOnServer.slice(0, 5).map((track, i) => (
                  <TrackRow key={i} track={{ title: track.track_title, url: track.track_url, artist: track.artist, thumbnail: track.thumbnail, duration: track.duration }} index={i} />
                ))}
              </div>
            </>
          )}
          {globalPopular.length > 0 && (
            <>
              <h3 className="subsection-title">Beliebt auf BeatByte</h3>
              <div className="card-scroll">
                {globalPopular.map((track, i) => (
                  <TrackCard key={i} track={{ title: track.track_title, url: track.track_url, artist: track.artist, thumbnail: track.thumbnail, duration: track.duration }} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {!state.current && trendingTracks.length === 0 && recentlyPlayed.length === 0 && !homeLoading && (
        <div className="empty-state">
          {Icons.music}
          <p>Willkommen bei BeatByte</p>
          <p className="empty-hint">Suche nach Songs oder entdecke die Charts</p>
        </div>
      )}
    </>
  );

  const renderLibrary = () => (
    <section className="content-section">
      <h2 className="section-title">Bibliothek</h2>

      {/* Tabs */}
      <div className="settings-tabs" style={{ marginBottom: 20 }}>
        <button className={`settings-tab${libraryTab === 'queue' ? ' active' : ''}`} onClick={() => setLibraryTab('queue')}>
          Queue {state.tracks.length > 0 && <span className="badge">{state.tracks.length}</span>}
        </button>
        <button className={`settings-tab${libraryTab === 'recent' ? ' active' : ''}`} onClick={() => setLibraryTab('recent')}>
          Zuletzt gehört
        </button>
        <button className={`settings-tab${libraryTab === 'playlists' ? ' active' : ''}`} onClick={() => setLibraryTab('playlists')}>
          Playlists {playlists.length > 0 && <span className="badge">{playlists.length}</span>}
        </button>
      </div>

      {libraryTab === 'recent' && (
        <>
          {(() => {
            const seen = new Set();
            const unique = recentlyPlayed.filter(t => {
              const key = t.url || t.title;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return unique.length === 0 ? (
              <div className="empty-state">
                {Icons.headphones}
                <p>Noch nichts gehört</p>
                <p className="empty-hint">Spiele Songs ab und sie erscheinen hier</p>
              </div>
            ) : (
              <div className="track-list">
                {unique.map((track, i) => (
                  <TrackRow key={i} track={track} index={i} />
                ))}
              </div>
            );
          })()}
        </>
      )}

      {libraryTab === 'queue' && (
        <>
          {state.tracks.length > 0 ? (
            <>
              <div className="queue-header">
                <div className="queue-header-left">
                  <span className="queue-count">{state.tracks.length} Songs</span>
                </div>
                <div className="queue-header-actions">
                  <button className="queue-action-btn" onClick={() => setShowSaveInput(!showSaveInput)}>{Icons.add} <span>Speichern</span></button>
                  <button className="queue-action-btn danger" onClick={async () => {
                  try { await fetch(`${botUrl}/api/guild/${guild.id}/queue`, { method: 'DELETE', headers: getHeaders() }); fetchState(guild.id); } catch {}
                }}>{Icons.delete} <span>Leeren</span></button>
                </div>
              </div>

              {showSaveInput && (
                <div className="playlist-save-form">
                  <input className="playlist-name-input" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Playlist-Name..." maxLength={50} onKeyDown={e => e.key === 'Enter' && savePlaylist()} autoFocus />
                  <button className="btn-playlist-save" onClick={savePlaylist} disabled={savingPlaylist || !playlistName.trim()}>
                    {savingPlaylist ? '...' : 'Speichern'}
                  </button>
                </div>
              )}

              <div className="track-list">
                {state.tracks.map((track, i) => (
                  <TrackRow key={i} track={track} index={i} onRemove={() => removeFromQueue(i)} draggable />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="empty-state">
                {Icons.music}
                <p>Queue ist leer</p>
                <p className="empty-hint">Suche nach Songs oder lade eine Playlist</p>
              </div>

              {playlists.length > 0 && (
                <div className="queue-suggestions">
                  <h3 className="subsection-title">Playlist abspielen</h3>
                  <div className="queue-suggestion-list">
                    {playlists.map(p => (
                      <button key={p.id} className="queue-suggestion-item" onClick={() => openPlaylistDetail(p.id)}>
                        <div className="queue-suggestion-cover">
                          {p.cover ? <img src={p.cover} alt="" /> : Icons.playlist}
                        </div>
                        <div className="queue-suggestion-info">
                          <span className="queue-suggestion-name">{p.name}</span>
                          <span className="queue-suggestion-count">{p.track_count} Songs</span>
                        </div>
                        <button className="queue-suggestion-add" onClick={(e) => { e.stopPropagation(); loadPlaylist(p.id); }}>Zur Queue hinzufügen</button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {libraryTab === 'playlists' && (
        <>
          {/* Import Card */}
          <div className={`import-card${showImport ? ' open' : ''}`}>
            <div className="import-card-header" onClick={() => setShowImport(!showImport)}>
              <div className="import-card-logos">
                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="#1ed760" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                <svg viewBox="0 0 24 24" width="24" height="24"><path fill="#ff0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div className="import-card-text">
                <span className="import-card-title">Playlist importieren</span>
                <span className="import-card-sub">Spotify & YouTube Link einfügen</span>
              </div>
              <span className={`import-card-chevron${showImport ? ' open' : ''}`}>{Icons.chevronDown}</span>
            </div>
            {showImport && (
              <div className="import-card-body">
                <div className="import-card-input-row">
                  <input className="import-card-input" value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." onKeyDown={e => e.key === 'Enter' && importPlaylist()} autoFocus />
                  <button className="import-card-btn" onClick={importPlaylist} disabled={importing || !importUrl.trim()}>
                    {importing ? '...' : 'Importieren'}
                  </button>
                </div>
                <div className="import-card-help">
                  <span className="import-card-help-title">So findest du deine Playlist-URL:</span>
                  <div className="import-card-steps">
                    <div className="import-card-step"><span className="import-step-num">1</span><span>Öffne Spotify oder YouTube und gehe zu deiner Playlist</span></div>
                    <div className="import-card-step"><span className="import-step-num">2</span><span>Klicke auf die drei Punkte (...) oder das Teilen-Symbol</span></div>
                    <div className="import-card-step"><span className="import-step-num">3</span><span>Wähle "Teilen" → "Link kopieren"</span></div>
                    <div className="import-card-step"><span className="import-step-num">4</span><span>Füge den Link oben ein</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {playlists.length === 0 && !showImport ? (
            <div className="empty-state">
              {Icons.playlist}
              <p>Keine Playlists</p>
              <p className="empty-hint">Importiere eine Playlist oder speichere deine Queue</p>
            </div>
          ) : (
            <div className="playlist-grid">
              {playlists.map(p => (
                <div key={p.id} className="playlist-card-lg">
                  <div className="playlist-card-lg-top" onClick={() => openPlaylistDetail(p.id)}>
                    {p.cover ? <img src={p.cover} alt="" className="playlist-card-lg-cover" /> : <div className="playlist-card-lg-icon">{Icons.playlist}</div>}
                    <div className="playlist-card-lg-play">{Icons.playSmall}</div>
                  </div>
                  <div className="playlist-card-lg-info">
                    <span className="playlist-card-lg-name">{p.name}</span>
                    <span className="playlist-card-lg-count">{p.track_count} Songs</span>
                  </div>
                  <button className="playlist-card-delete" onClick={() => deletePlaylist(p.id)}>{Icons.delete}</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </section>
  );

  const renderLiked = () => (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">Liked Songs <span className="badge">{likedSongs.length}</span></h2>
      </div>
      {likedSongs.length === 0 ? (
        <div className="empty-state">
          {Icons.heart}
          <p>Keine Liked Songs</p>
          <p className="empty-hint">Klicke auf das Herz-Icon bei einem Song um ihn hier zu speichern</p>
        </div>
      ) : (
        <div className="track-list">
          {likedSongs.map((track, i) => (
            <TrackRow key={i} track={track} index={i} />
          ))}
        </div>
      )}
    </section>
  );

  const importPlaylist = async () => {
    if (!guild || !importUrl.trim()) return;
    setImporting(true); setError('');
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/playlists/import`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ url: importUrl.trim(), name: importName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportUrl(''); setImportName(''); setShowImport(false);
      fetchPlaylists();
    } catch (err) { setError(err.message); }
    setImporting(false);
  };

  const renderSettings = () => (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">{Icons.settings} Einstellungen</h2>
        <button className="btn-close-results" onClick={() => setActiveView('home')}>Zurück</button>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button className={`settings-tab${settingsTab === 'overview' ? ' active' : ''}`} onClick={() => setSettingsTab('overview')}>Übersicht</button>
        <button className={`settings-tab${settingsTab === 'audio' ? ' active' : ''}`} onClick={() => setSettingsTab('audio')}>Audio</button>
      </div>

      {settingsTab === 'overview' ? (
        <>
          {/* Profil */}
          <div className="settings-group">
            <h3 className="settings-group-title">Profil</h3>
            <div className="settings-card">
              <div className="settings-profile">
                {oauthUser ? (
                  <>
                    <img
                      src={oauthUser.avatar
                        ? `https://cdn.discordapp.com/avatars/${oauthUser.id}/${oauthUser.avatar}.png?size=128`
                        : `https://cdn.discordapp.com/embed/avatars/${(parseInt(oauthUser.id) >> 22) % 6}.png`}
                      alt="" className="settings-avatar"
                    />
                    <div className="settings-profile-info">
                      <span className="settings-profile-name">{oauthUser.global_name || oauthUser.username}</span>
                      <span className="settings-profile-tag">@{oauthUser.username}</span>
                      <span className="settings-profile-badge">Discord verbunden</span>
                    </div>
                  </>
                ) : (
                  <div className="settings-profile-info">
                    <span className="settings-profile-name">Gast</span>
                    <span className="settings-profile-tag">Angemeldet mit Zugangs-Code</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Server */}
          {guild && (
            <div className="settings-group">
              <h3 className="settings-group-title">Server</h3>
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">Verbundener Server</span>
                  <div className="settings-value">
                    {guild.icon && <img src={guild.icon} alt="" className="settings-guild-icon" />}
                    <span>{guild.name}</span>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Server URL</span>
                  <span className="settings-value mono">{botUrl}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Voice Status</span>
                  <span className={`settings-value ${state.connected ? 'connected' : ''}`}>
                    {state.connected ? 'Verbunden' : 'Nicht verbunden'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Daten */}
          <div className="settings-group">
            <h3 className="settings-group-title">Daten & Cache</h3>
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">Liked Songs</span>
                <span className="settings-value">{likedSongs.length} Songs</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Zuletzt gehört</span>
                <span className="settings-value">{recentlyPlayed.length} Songs</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Discover-Cache</span>
                <button className="settings-btn" onClick={() => { sessionStorage.clear(); fetchHomepageContent(activeGenre, true); }}>Cache leeren</button>
              </div>
              <div className="settings-row">
                <span className="settings-label">Alle lokalen Daten</span>
                <button className="settings-btn danger" onClick={() => { if (confirm('Alle lokalen Daten löschen?')) { localStorage.clear(); sessionStorage.clear(); window.location.reload(); } }}>Zurücksetzen</button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="settings-group">
            <h3 className="settings-group-title">Info</h3>
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">App</span>
                <span className="settings-value">BeatByte Web Player</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">Land</span>
                <span className="settings-value">{detectedCountry.name}</span>
              </div>
            </div>
          </div>

          <p className="settings-disclaimer">Alle Marken, Logos und Dienstnamen sind Eigentum ihrer jeweiligen Inhaber. BeatByte ist nicht mit Spotify, YouTube, Apple Music oder Deezer verbunden oder von diesen unterstützt.</p>
        </>
      ) : (
        <>
          {/* Filter Presets */}
          <div className="settings-group">
            <h3 className="settings-group-title">Audio-Filter</h3>
            <div className="filter-presets">
              {filterPresets.map(p => (
                <button key={p.id} className={`filter-preset${activeFilter === p.id ? ' active' : ''}`} onClick={() => setFilter(p.id)}>
                  <span className="filter-preset-icon">{p.icon}</span>
                  <span className="filter-preset-label">{p.label}</span>
                  <span className="filter-preset-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Equalizer */}
          <div className="settings-group">
            <h3 className="settings-group-title">Equalizer</h3>
            <div className="settings-card eq-card">
              <div className="eq-container">
                {eqBands.map((band, i) => (
                  <div key={i} className="eq-band">
                    <span className="eq-value">{eqValues[i] > 0 ? `+${eqValues[i]}` : eqValues[i]}</span>
                    <div className="eq-slider-wrap">
                      <input type="range" className="eq-slider" min="-12" max="12" step="1" value={eqValues[i]}
                        onChange={e => {
                          const newVals = [...eqValues];
                          newVals[i] = parseInt(e.target.value);
                          setEqValues(newVals);
                          localStorage.setItem('eqValues', JSON.stringify(newVals));
                          sendEqToBackend(newVals);
                          syncEqToServer(newVals);
                        }}
                      />
                    </div>
                    <span className="eq-freq">{band.freq}</span>
                    <span className="eq-label">{band.label}</span>
                  </div>
                ))}
              </div>
              <div className="eq-actions">
                <button className="settings-btn" onClick={() => { const reset = [0,0,0,0,0,0,0]; setEqValues(reset); localStorage.setItem('eqValues', JSON.stringify(reset)); setFilter('off'); syncEqToServer(reset); }}>Zurücksetzen</button>
              </div>
            </div>
          </div>

          {/* Wiedergabe */}
          <div className="settings-group">
            <h3 className="settings-group-title">Wiedergabe</h3>
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">Lautstärke</span>
                <div className="settings-value">
                  <input type="range" className="volume-slider" min="0" max="200" value={localVolume} onChange={e => {
                  const v = Number(e.target.value);
                  setLocalVolume(v);
                  clearTimeout(volumeTimerRef.current);
                  volumeTimerRef.current = setTimeout(() => { apiAction('volume', { volume: v }); volumeTimerRef.current = null; }, 300);
                }} style={{ width: 120 }} />
                  <span>{localVolume}%</span>
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-label">Loop-Modus</span>
                <button className="settings-btn" onClick={() => apiAction('loop')}>{state.loopMode === 'off' ? 'Aus' : state.loopMode === 'song' ? 'Song' : 'Queue'}</button>
              </div>
              <div className="settings-row">
                <span className="settings-label">Auto-DJ</span>
                <button className={`settings-btn${state.autoDj ? ' active-btn' : ''}`} onClick={() => apiAction('autodj')}>{state.autoDj ? 'An' : 'Aus'}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );

  // ── Profile View ──────────────────────────────────────────────
  const renderProfile = () => {
    const user = oauthUser;
    const avatarUrl = user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : user ? `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.id) >> 22) % 6}.png` : null;

    // Stats from local data
    const totalLikedSeconds = likedSongs.reduce((sum, t) => {
      if (!t.duration) return sum;
      const parts = t.duration.split(':').map(Number);
      return sum + (parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
    }, 0);
    const totalHours = Math.floor(totalLikedSeconds / 3600);
    const totalMins = Math.round((totalLikedSeconds % 3600) / 60);

    // Top artists from liked songs
    const artistCounts = {};
    likedSongs.forEach(t => { if (t.artist) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1; });
    const topArtistsFromLikes = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
    const maxCount = topArtistsFromLikes[0]?.count || 1;

    return (
      <section className="content-section">
        <div className="section-header">
          <h2 className="section-title">{Icons.user} Profil</h2>
          <button className="btn-close-results" onClick={() => setActiveView('home')}>Zurück</button>
        </div>

        {/* Profile Hero */}
        <div className="profile-hero">
          <div className="profile-hero-avatar">
            {avatarUrl && <img src={avatarUrl} alt="" />}
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{user?.global_name || user?.username || 'Guest'}</h1>
            {user?.username && <span className="profile-hero-tag">@{user.username}</span>}
            {guild && <span className="profile-hero-server">{guild.name}</span>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{likedSongs.length}</span>
            <span className="profile-stat-label">Liked Songs</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{playlists.length}</span>
            <span className="profile-stat-label">Playlists</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`}</span>
            <span className="profile-stat-label">Liked Dauer</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{recentlyPlayed.length}</span>
            <span className="profile-stat-label">Zuletzt gehört</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="profile-grid">
          {/* Top Artists from Likes */}
          <div className="profile-card">
            <h3 className="profile-card-title">{Icons.heartFilled} Top Artists</h3>
            {topArtistsFromLikes.length > 0 ? (
              <div className="profile-artist-list">
                {topArtistsFromLikes.map((a, i) => (
                  <div key={a.name} className="profile-artist-row" onClick={() => { setActiveView('search'); onSearchInput(a.name); }}>
                    <span className="profile-artist-rank">{i + 1}</span>
                    <span className="profile-artist-name">{a.name}</span>
                    <div className="profile-artist-bar-wrap">
                      <div className="profile-artist-bar" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="profile-artist-count">{a.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-empty">Like Songs um deine Top Artists zu sehen</div>
            )}
          </div>

          {/* Recently Played */}
          <div className="profile-card">
            <h3 className="profile-card-title">{Icons.headphones} Zuletzt gehört</h3>
            {recentlyPlayed.length > 0 ? (
              <div className="track-list compact">
                {recentlyPlayed.slice(0, 8).map((track, i) => (
                  <TrackRow key={i} track={track} index={i} showDuration />
                ))}
              </div>
            ) : (
              <div className="profile-empty">Noch keine Songs angehört</div>
            )}
          </div>
        </div>

        {/* Liked Songs Preview */}
        {likedSongs.length > 0 && (
          <>
            <div className="profile-section-header">
              <h3 className="subsection-title">{Icons.heartFilled} Deine Liked Songs</h3>
              <button className="btn-save-queue" onClick={() => setActiveView('liked')}>Alle anzeigen</button>
            </div>
            <div className="horizontal-scroll">
              {likedSongs.slice(0, 10).map((track, i) => (
                <TrackCard key={i} track={track} />
              ))}
            </div>
          </>
        )}

        {/* Playlists Preview */}
        {playlists.length > 0 && (
          <>
            <div className="profile-section-header">
              <h3 className="subsection-title">{Icons.playlist} Deine Playlists</h3>
              <button className="btn-save-queue" onClick={() => { setActiveView('library'); setLibraryTab('playlists'); }}>Alle anzeigen</button>
            </div>
            <div className="profile-playlists">
              {playlists.slice(0, 6).map(p => (
                <button key={p.id} className="profile-playlist-card" onClick={() => openPlaylistDetail(p.id)}>
                  <div className="profile-playlist-icon">{Icons.playlist}</div>
                  <div className="profile-playlist-info">
                    <span className="profile-playlist-name">{p.name}</span>
                    <span className="profile-playlist-count">{p.track_count} Songs</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    );
  };

  const renderPlaylistDetail = () => {
    if (!openPlaylist) return null;
    const tracks = openPlaylist.tracks || [];
    const totalDur = tracks.reduce((sum, t) => {
      if (!t.duration) return sum;
      const parts = t.duration.split(':').map(Number);
      return sum + (parts.length === 2 ? parts[0] * 60 + parts[1] : 0);
    }, 0);
    const totalMin = Math.floor(totalDur / 60);

    return (
      <section className="content-section">
        {/* Header */}
        <div className="playlist-detail-header">
          <div className="playlist-detail-cover">
            {tracks[0]?.thumbnail ? <img src={tracks[0].thumbnail} alt="" /> : <div className="playlist-detail-cover-empty">{Icons.playlist}</div>}
          </div>
          <div className="playlist-detail-info">
            <span className="playlist-detail-type">Playlist</span>
            <h1 className="playlist-detail-name">{openPlaylist.name}</h1>
            <span className="playlist-detail-meta">{tracks.length} Songs · {totalMin} Min.</span>
            <div className="playlist-detail-actions">
              <button className="playlist-detail-play" onClick={() => loadPlaylist(openPlaylist.id)}>{Icons.play}</button>
              <button className="playlist-detail-action-btn" onClick={async () => {
                await loadPlaylist(openPlaylist.id);
                if (guild) apiAction('shuffle');
              }} title="Shuffle abspielen">{Icons.shuffle}</button>
              <button className="playlist-detail-action-btn" onClick={() => { deletePlaylist(openPlaylist.id); setOpenPlaylist(null); setActiveView('library'); setLibraryTab('playlists'); }} title="Playlist löschen">{Icons.delete}</button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="playlist-detail-toolbar">
          <span className="playlist-detail-toolbar-count">{tracks.length} Songs</span>
          <div className="playlist-detail-toolbar-actions">
            <button className="settings-btn" onClick={() => loadPlaylist(openPlaylist.id)}>Zur Queue hinzufügen</button>
          </div>
        </div>

        {/* Track List */}
        <div className="track-list" style={{ marginTop: 8 }}>
          {tracks.map((track, i) => (
            <TrackRow key={i} track={track} index={i} />
          ))}
        </div>
      </section>
    );
  };

  const renderSearch = () => {
    if (searching && searchResults.length === 0) return <div className="search-loading"><span className="adding-spinner large" /> Suche...</div>;
    if (searchResults.length === 0 && searchArtists.length === 0 && searchAlbums.length === 0) return null;

    const topArtist = searchArtists[0];

    return (
      <>
        {/* Top Result + Artist */}
        {(topArtist || searchResults.length > 0) && (
          <div className="search-top-grid">
            {/* Top Result Card */}
            {searchResults.length > 0 && (
              <div className="search-top-result" onClick={() => addToQueue(searchResults[0])}>
                <h3 className="subsection-title">Top-Ergebnis</h3>
                <div className="top-result-card">
                  {searchResults[0].thumbnail && <img src={searchResults[0].thumbnail} alt="" className="top-result-img" />}
                  <span className="top-result-title">{searchResults[0].title}</span>
                  {searchResults[0].artist && <span className="top-result-artist">{searchResults[0].artist}</span>}
                  <div className="top-result-play">{Icons.play}</div>
                </div>
              </div>
            )}

            {/* Artist Card */}
            {topArtist && (
              <div className="search-artist-result">
                <h3 className="subsection-title">Artist</h3>
                <div className="artist-result-card" onClick={() => searchGenre(topArtist.name)}>
                  <div className="artist-result-avatar">
                    {topArtist.image ? <img src={topArtist.image} alt="" /> : <div className="artist-card-placeholder">{topArtist.name[0]}</div>}
                  </div>
                  <span className="artist-result-name">{topArtist.name}</span>
                  {topArtist.genres?.length > 0 && <span className="artist-result-genre">{topArtist.genres.join(', ')}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Songs with Artist badges */}
        {searchResults.length > 0 && (
          <section className="content-section">
            <h3 className="subsection-title">Songs</h3>
            <div className="track-list">
              {searchResults.slice(0, 6).map((track, i) => (
                <div key={i} className={`track-row search-track-row`} onClick={() => addToQueue(track)}>
                  <span className="track-row-num">{i + 1}</span>
                  <div className="track-row-thumb">
                    {track.thumbnail ? <img src={track.thumbnail} alt="" /> : <div className="track-row-thumb-empty" />}
                    <button className="track-row-play-overlay" onClick={(e) => { e.stopPropagation(); addToQueue(track); }}>
                      {adding === track.url ? <span className="adding-spinner" /> : Icons.playSmall}
                    </button>
                  </div>
                  <div className="track-row-info">
                    <span className="track-row-title">{track.title}</span>
                    {track.albumName && <span className="track-row-album">{track.albumName}</span>}
                  </div>
                  {track.artistImage ? (
                    <div className="track-artist-chip" onClick={(e) => { e.stopPropagation(); searchGenre(track.artist); }}>
                      <img src={track.artistImage} alt="" className="track-artist-chip-img" />
                      <span>{track.artist}</span>
                    </div>
                  ) : (
                    track.artist && <span className="track-row-artist">{track.artist}</span>
                  )}
                  <button className={`track-row-like${isLiked(track.url) ? ' liked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(track); }}>
                    {isLiked(track.url) ? Icons.heartFilled : Icons.heartOutline}
                  </button>
                  <span className="track-row-duration">{track.duration}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {searchAlbums.length > 0 && (
          <section className="content-section">
            <h3 className="subsection-title">Alben</h3>
            <div className="card-scroll">
              {searchAlbums.map((album, i) => (
                <div key={i} className="album-card" onClick={() => searchGenre(`${album.artist} ${album.name}`)}>
                  <div className="album-card-cover">
                    {album.image ? <img src={album.image} alt="" /> : <div className="track-card-empty" />}
                    <div className="track-card-play">{Icons.playSmall}</div>
                  </div>
                  <div className="track-card-title">{album.name}</div>
                  <div className="track-card-artist">{album.artist}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* More Songs (rest) */}
        {searchResults.length > 6 && (
          <section className="content-section">
            <h3 className="subsection-title">Weitere Songs</h3>
            <div className="card-scroll">
              {searchResults.slice(6).map((track, i) => <TrackCard key={i} track={track} />)}
            </div>
          </section>
        )}

        {/* More Artists */}
        {searchArtists.length > 1 && (
          <section className="content-section">
            <h3 className="subsection-title">Weitere Artists</h3>
            <div className="artist-scroll">
              {searchArtists.slice(1).map((artist, i) => (
                <ArtistCard key={i} artist={{ name: artist.name, thumbnail: artist.image }} />
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  // ── Main Render ────────────────────────────────────────────────
  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <img src="https://cdn.discordapp.com/avatars/1488919318472298647/4764a9259454d44d47e75034c1f9c03b.png?size=128" alt="BeatByte" className="brand-logo" />
            <span className="brand-text">BeatByte</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item${activeView === item.id ? ' active' : ''}`} onClick={() => { setActiveView(item.id); setSearchResults([]); }}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Playlists Quick Access */}
        {playlists.length > 0 && (
          <div className="sidebar-playlists">
            <div className="sidebar-label">Playlists</div>
            {playlists.slice(0, 6).map(p => (
              <button key={p.id} className="sidebar-playlist-item" onClick={() => openPlaylistDetail(p.id)}>
                {p.cover ? <img src={p.cover} alt="" className="sidebar-playlist-cover" /> : <span className="nav-icon">{Icons.playlist}</span>}
                <span className="nav-label">{p.name}</span>
              </button>
            ))}
            <button className="sidebar-playlist-item sidebar-playlist-add" onClick={() => { setActiveView('library'); setLibraryTab('playlists'); }}>
              <span className="nav-icon">{Icons.add}</span>
              <span className="nav-label">Importieren</span>
            </button>
          </div>
        )}

        {guild && (
          <div className="sidebar-guild">
            <div className="sidebar-label">Server</div>
            <div className="guild-active">
              {guild.icon ? <img src={guild.icon} alt="" className="guild-icon" /> : <div className="guild-placeholder">{guild.name[0]}</div>}
              <span className="guild-name">{guild.name}</span>
            </div>
          </div>
        )}

        <div className="sidebar-bottom">
          <button className="btn-disconnect" onClick={logout}>
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="top-bar">
          <div className="search-container">
            {Icons.search}
            <input className="search-input" value={searchQuery} onChange={e => onSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Songs, Artists oder Alben suchen..." />
            {searchQuery && <button className="search-clear" onClick={() => { onSearchInput(''); }}>{Icons.close}</button>}
          </div>
          {state.connected ? (
            <div className="voice-chip connected">
              <div className="voice-status-dot" />
              <span>Verbunden</span>
            </div>
          ) : (
            <button className="voice-chip" onClick={() => setShowChannelPicker(true)}>
              {Icons.headphones}
              <span>Verbinden</span>
            </button>
          )}
          <div className="profile-area" ref={profileRef}>
            {oauthUser ? (
              <>
                <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
                  <img
                    src={oauthUser.avatar
                      ? `https://cdn.discordapp.com/avatars/${oauthUser.id}/${oauthUser.avatar}.png?size=64`
                      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(oauthUser.id) >> 22) % 6}.png`}
                    alt="" className="profile-avatar"
                  />
                  <span className="profile-name">{oauthUser.global_name || oauthUser.username}</span>
                  {Icons.chevronDown}
                </button>
                {profileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <img
                        src={oauthUser.avatar
                          ? `https://cdn.discordapp.com/avatars/${oauthUser.id}/${oauthUser.avatar}.png?size=128`
                          : `https://cdn.discordapp.com/embed/avatars/${(parseInt(oauthUser.id) >> 22) % 6}.png`}
                        alt="" className="profile-dropdown-avatar"
                      />
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{oauthUser.global_name || oauthUser.username}</span>
                        <span className="profile-dropdown-tag">@{oauthUser.username}</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); setActiveView('profile'); }}>
                      {Icons.user}<span>Profil</span>
                    </button>
                    <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); setActiveView('settings'); }}>
                      {Icons.settings}<span>Einstellungen</span>
                    </button>
                    <button className="profile-dropdown-item logout" onClick={() => { setProfileOpen(false); logout(); }}>
                      {Icons.logoutIcon}<span>Logout</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="profile-btn guest" onClick={loginWithDiscord}>
                <span className="profile-guest-icon">{Icons.user}</span>
                <span className="profile-name">Guest</span>
              </button>
            )}
          </div>
        </header>

        {error && <div className="error-banner" onClick={() => setError('')}>{error}</div>}

        <div className="content">
          {activeView === 'search' ? renderSearch() :
           activeView === 'library' ? renderLibrary() :
           activeView === 'liked' ? renderLiked() :
           activeView === 'playlist-detail' ? renderPlaylistDetail() :
           activeView === 'profile' ? renderProfile() :
           activeView === 'settings' ? renderSettings() :
           renderHome()}
        </div>

        {/* Channel Picker Modal */}
        {showChannelPicker && (
          <div className="modal-overlay" onClick={() => { setShowChannelPicker(false); setPendingTrack(null); }}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Voice Channel wählen</h3>
                <button className="modal-close" onClick={() => { setShowChannelPicker(false); setPendingTrack(null); }}>{Icons.close}</button>
              </div>
              {pendingTrack && (
                <div className="modal-track-preview">
                  {pendingTrack.thumbnail && <img src={pendingTrack.thumbnail} alt="" />}
                  <div className="modal-track-info">
                    <span className="modal-track-title">{pendingTrack.title}</span>
                    {pendingTrack.artist && <span className="modal-track-artist">{pendingTrack.artist}</span>}
                  </div>
                </div>
              )}
              <div className="modal-channels">
                {channels.map(ch => (
                  <button key={ch.id} className="channel-item" onClick={() => joinAndPlay(ch.id)} disabled={joiningChannel === ch.id}>
                    {Icons.headphones}
                    <span className="channel-name">{ch.name}</span>
                    {ch.members > 0 && <span className="channel-members">{ch.members}</span>}
                    <span className="channel-join">{joiningChannel === ch.id ? '...' : 'Beitreten'}</span>
                  </button>
                ))}
                {channels.length === 0 && <p className="modal-empty">Keine Voice Channels gefunden</p>}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`player-bar${state.current ? ' active' : ''}`}>
        {state.current ? (
          <>
            <div className="player-track">
              {(state.current.albumArt || state.current.thumbnail) && <img src={state.current.albumArt || state.current.thumbnail} alt="" className="player-cover" />}
              <div className="player-info">
                <span className="player-title">{state.current.title}</span>
                {state.current.artist && <span className="player-artist">{state.current.artist}</span>}
              </div>
              <button className={`player-like${isLiked(state.current.url) ? ' liked' : ''}`} onClick={() => toggleLike(state.current)}>
                {isLiked(state.current.url) ? Icons.heartFilled : Icons.heartOutline}
              </button>
            </div>
            <div className="player-center">
              <div className="player-controls">
                <button className="ctrl-btn" onClick={() => apiAction('shuffle')} title="Shuffle">{Icons.shuffle}</button>
                <button className="ctrl-btn ctrl-main" onClick={() => apiAction('pause')} title={state.paused ? 'Play' : 'Pause'}>
                  {state.paused ? Icons.play : Icons.pause}
                </button>
                <button className="ctrl-btn" onClick={() => apiAction('skip')} title="Skip">{Icons.skip}</button>
                <button className={`ctrl-btn${state.loopMode !== 'off' ? ' ctrl-active' : ''}`} onClick={() => apiAction('loop')} title={`Loop: ${loopIcons[state.loopMode]}`}>
                  {state.loopMode === 'song' ? (
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">1</text></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                  )}
                </button>
                <button className="ctrl-btn ctrl-stop" onClick={() => apiAction('stop')} title="Stop">{Icons.stop}</button>
              </div>
              <div className="player-progress">
                <span className="player-time">{fmtTime(localElapsed)}</span>
                <div className="player-progress-bar"><div className="player-progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="player-time">{state.current.duration}</span>
              </div>
            </div>
            <div className="player-right">
              <button className={`ctrl-btn autodj-toggle${state.autoDj ? ' ctrl-active' : ''}`} onClick={() => apiAction('autodj')} title={`Auto-DJ: ${state.autoDj ? 'On' : 'Off'}`}>
                {Icons.dj}<span className="autodj-label">DJ</span>
              </button>
              <a className="ctrl-btn" href={`https://www.google.com/search?q=${encodeURIComponent(state.current.title + ' lyrics')}`} target="_blank" rel="noopener noreferrer" title="Lyrics">{Icons.lyrics}</a>
              <div className="volume-control">
                {Icons.volume}
                <input type="range" className="volume-slider" min="0" max="200" value={localVolume} onChange={e => {
                  const v = Number(e.target.value);
                  setLocalVolume(v);
                  clearTimeout(volumeTimerRef.current);
                  volumeTimerRef.current = setTimeout(() => { apiAction('volume', { volume: v }); volumeTimerRef.current = null; }, 300);
                }} title={`${localVolume}%`} />
              </div>
            </div>
          </>
        ) : null}
      </footer>
    </div>
  );
}

export default App;

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
  collapse: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
  play: <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>,
  pause: <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  skip: <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>,
  shuffle: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>,
  stop: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>,
  volume: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>,
  add: <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  headphones: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>,
  delete: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  music: <svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" opacity="0.3"/></svg>,
  lyrics: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>,
  dj: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>,
  dots: <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>,
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
  const [state, setState] = useState({ current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const [channels, setChannels] = useState([]);
  const [joiningChannel, setJoiningChannel] = useState(null);
  const [error, setError] = useState('');
  const [localElapsed, setLocalElapsed] = useState(0);
  const [playlists, setPlaylists] = useState([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);
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
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [popularArtists, setPopularArtists] = useState([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [likedSongs, setLikedSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('likedSongs') || '[]'); } catch { return []; }
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentlyPlayed') || '[]'); } catch { return []; }
  });

  const wsRef = useRef(null);
  const guildRef = useRef(null);
  const prevTrackRef = useRef(null);

  useEffect(() => { guildRef.current = guild; }, [guild]);

  // Track recently played
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

  // Persist liked songs
  useEffect(() => {
    localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  const toggleLike = (track) => {
    setLikedSongs(prev => {
      const exists = prev.find(t => t.url === track.url);
      if (exists) return prev.filter(t => t.url !== track.url);
      return [...prev, { ...track, likedAt: Date.now() }];
    });
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
      if (res.ok) setState(await res.json());
    } catch {}
  }, [botUrl, getHeaders]);

  // Auto-reconnect or handle Discord OAuth callback
  useEffect(() => {
    // Check for Discord OAuth callback
    const params = new URLSearchParams(window.location.search);
    const discordToken = params.get('discord_token');
    const oauthError = params.get('error');

    if (oauthError) {
      const msgs = { discord_denied: 'Discord Login abgebrochen.', no_shared_guilds: 'Kein gemeinsamer Server mit dem Bot gefunden.', invalid_state: 'Ungueltiger Login-Versuch.', oauth_failed: 'Discord Login fehlgeschlagen.' };
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

    if (!token) return;
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
            connectWebSocket(token);
          } else { logout(); }
        } else { logout(); }
      } catch { logout(); }
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
    const interval = setInterval(() => fetchState(guild.id), 3000);
    return () => clearInterval(interval);
  }, [connected, guild, fetchState]);

  useEffect(() => {
    if (!connected || !guild || state.connected) { setChannels([]); return; }
    (async () => {
      try {
        const res = await fetch(`${botUrl}/api/guild/${guild.id}/channels`, { headers: getHeaders() });
        if (res.ok) setChannels(await res.json());
      } catch {}
    })();
  }, [connected, guild, state.connected, botUrl, getHeaders]);

  const joinChannel = async (channelId) => {
    if (!guild) return;
    setJoiningChannel(channelId);
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/join`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ channelId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchState(guild.id);
    } catch (err) { setError(err.message); }
    setJoiningChannel(null);
  };

  const search = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResults([]); setError('');
    setActiveView('search');
    try {
      const res = await fetch(`${botUrl}/api/search?q=${encodeURIComponent(searchQuery)}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data);
    } catch (err) { setError(err.message); }
    setSearching(false);
  };

  const addToQueue = async (track) => {
    if (!guild) return;
    setAdding(track.url);
    try {
      const res = await fetch(`${botUrl}/api/guild/${guild.id}/play`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ query: track.url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchState(guild.id);
    } catch (err) { setError(err.message); }
    setAdding(null);
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

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch dynamic homepage content
  const fetchHomepageContent = useCallback(async () => {
    if (!connected || !guild || homeLoading) return;
    setHomeLoading(true);
    const fetchCategory = async (query) => {
      try {
        const res = await fetch(`${botUrl}/api/search?q=${encodeURIComponent(query)}&limit=10`, { headers: getHeaders() });
        if (res.ok) return await res.json();
      } catch {}
      return [];
    };

    const [trending, newRel, recommended] = await Promise.all([
      fetchCategory('trending music 2025'),
      fetchCategory('new music releases 2025'),
      fetchCategory(likedSongs.length > 0 ? `${likedSongs[0]?.artist || 'music'} mix` : 'top hits mix'),
    ]);

    setTrendingTracks(trending.slice(0, 8));
    setNewReleases(newRel.slice(0, 8));
    setRecommendedTracks(recommended.slice(0, 8));

    // Extract unique artists from all results
    const artistMap = {};
    [...trending, ...newRel, ...recommended, ...recentlyPlayed, ...likedSongs].forEach(t => {
      if (t.artist && !artistMap[t.artist]) {
        artistMap[t.artist] = { name: t.artist, thumbnail: t.thumbnail };
      }
    });
    setPopularArtists(Object.values(artistMap).slice(0, 8));
    setHomeLoading(false);
  }, [connected, guild, botUrl, getHeaders, likedSongs, recentlyPlayed, homeLoading]);

  useEffect(() => {
    if (connected && guild && trendingTracks.length === 0 && !homeLoading) {
      fetchHomepageContent();
    }
  }, [connected, guild]);

  const totalDuration = state.current ? parseDuration(state.current.duration) : 0;
  const progress = totalDuration > 0 ? Math.min((localElapsed / totalDuration) * 100, 100) : 0;
  const loopIcons = { off: 'Off', song: 'Song', queue: 'Queue' };

  // ── Setup Screen ───────────────────────────────────────────────
  if (!connected) {
    // Guild selection after Discord OAuth
    if (oauthGuilds && oauthGuilds.length > 1) {
      return (
        <div className="setup">
          <div className="setup-card">
            <div className="setup-logo">
              <div className="setup-logo-icon">{Icons.equalizer}</div>
            </div>
            <h1>Server waehlen</h1>
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
            <div className="setup-logo-icon">{Icons.equalizer}</div>
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
    { id: 'library', icon: Icons.library, label: 'Library' },
    { id: 'liked', icon: Icons.heart, label: 'Liked Songs' },
    { id: 'playlists', icon: Icons.playlist, label: 'Playlists' },
  ];

  // ── Genre Quick Search ──────────────────────────────────────────
  const genres = [
    { name: 'Lofi', query: 'lofi hip hop' },
    { name: 'Phonk', query: 'phonk music' },
    { name: 'Pop', query: 'pop hits 2024' },
    { name: 'Rap', query: 'rap hits deutsch' },
    { name: 'Rock', query: 'rock classics' },
    { name: 'R&B', query: 'rnb soul' },
    { name: 'Techno', query: 'techno music' },
    { name: 'Chill', query: 'chill vibes' },
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
  const FeaturedCard = ({ track }) => (
    <div className="featured-card" onClick={() => addToQueue(track)}>
      <div className="featured-card-bg">
        {track.thumbnail && <img src={track.thumbnail} alt="" />}
      </div>
      <div className="featured-card-overlay" />
      <div className="featured-card-content">
        <span className="featured-card-title">{track.title}</span>
        {track.artist && <span className="featured-card-artist">{track.artist}</span>}
      </div>
      <div className="featured-card-play">{Icons.playSmall}</div>
    </div>
  );

  // Build featured tracks from recently played + queue
  const featuredTracks = (() => {
    const seen = new Set();
    const tracks = [];
    const sources = [...recentlyPlayed, ...state.tracks, ...likedSongs];
    for (const t of sources) {
      if (!seen.has(t.url) && t.thumbnail) {
        seen.add(t.url);
        tracks.push(t);
      }
      if (tracks.length >= 6) break;
    }
    return tracks;
  })();

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
  const renderHome = () => (
    <>
      {!state.connected && channels.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Voice Channel beitreten</h2>
          <div className="channel-list">
            {channels.map(ch => (
              <button key={ch.id} className="channel-item" onClick={() => joinChannel(ch.id)} disabled={joiningChannel === ch.id}>
                {Icons.headphones}
                <span className="channel-name">{ch.name}</span>
                {ch.members > 0 && <span className="channel-members">{ch.members}</span>}
                <span className="channel-join">{joiningChannel === ch.id ? '...' : 'Beitreten'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Now Playing Hero */}
      {state.current && (
        <section className="content-section">
          <h2 className="section-title">Now Playing</h2>
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

      {/* Genre Quick Search */}
      <section className="content-section">
        <div className="genre-bar">
          <h3 className="genre-bar-title">Waehle ein Genre</h3>
          <p className="genre-bar-sub">Deine Playlist entwickelt sich basierend auf dem, was du magst.</p>
          <div className="genre-chips">
            {genres.map(g => (
              <button key={g.name} className="genre-chip" onClick={() => searchGenre(g.query)}>{g.name}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now */}
      {trendingTracks.length > 0 && (
        <section className="content-section">
          <div className="section-header">
            <h2 className="section-title">{Icons.fire} Trending Now</h2>
            <button className="btn-refresh" onClick={fetchHomepageContent} title="Aktualisieren">{Icons.refresh}</button>
          </div>
          <div className="card-scroll">
            {trendingTracks.map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* Featured Song Cards */}
      {featuredTracks.length > 0 && (
        <section className="content-section">
          <div className="featured-grid">
            {featuredTracks.slice(0, 3).map((track, i) => <FeaturedCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* Fuer dich empfohlen */}
      {recommendedTracks.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">{Icons.sparkle} Fuer dich empfohlen</h2>
          <div className="track-list">
            {recommendedTracks.slice(0, 6).map((track, i) => (
              <TrackRow key={i} track={track} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Neu erschienen */}
      {newReleases.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Neu erschienen</h2>
          <div className="card-scroll">
            {newReleases.map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* Beliebte Artists */}
      {popularArtists.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Beliebte Artists</h2>
          <div className="artist-scroll">
            {popularArtists.map((artist, i) => <ArtistCard key={i} artist={artist} />)}
          </div>
        </section>
      )}

      {/* Zuletzt gehoert */}
      {recentlyPlayed.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Zuletzt gehoert</h2>
          <div className="track-list">
            {recentlyPlayed.slice(0, 8).map((track, i) => (
              <TrackRow key={i} track={track} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Up Next Cards */}
      {state.tracks.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Up Next <span className="badge">{state.tracks.length}</span></h2>
          <div className="card-scroll">
            {state.tracks.slice(0, 8).map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {/* Deine Playlists */}
      {playlists.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Deine Playlists</h2>
          <div className="card-grid">
            {playlists.map(p => (
              <div key={p.id} className="playlist-card" onClick={() => loadPlaylist(p.id)}>
                <div className="playlist-card-icon">{Icons.playlist}</div>
                <div className="playlist-card-info">
                  <span className="playlist-card-name">{p.name}</span>
                  <span className="playlist-card-count">{p.track_count} Songs</span>
                </div>
                <div className="playlist-card-play">{Icons.playSmall}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading indicator for homepage content */}
      {homeLoading && trendingTracks.length === 0 && (
        <div className="home-loading">
          <span className="adding-spinner large" />
          <p>Inhalte werden geladen...</p>
        </div>
      )}

      {!state.current && state.tracks.length === 0 && recentlyPlayed.length === 0 && playlists.length === 0 && channels.length === 0 && trendingTracks.length === 0 && !homeLoading && (
        <div className="empty-state">
          {Icons.music}
          <p>Willkommen bei BeatByte</p>
          <p className="empty-hint">Waehle ein Genre oder suche nach Songs</p>
        </div>
      )}
    </>
  );

  const renderLibrary = () => (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">Queue {state.tracks.length > 0 && <span className="badge">{state.tracks.length}</span>}</h2>
        {state.tracks.length > 0 && (
          <div className="section-actions">
            <button className="btn-save-queue" onClick={() => setShowSaveInput(!showSaveInput)}>Save as Playlist</button>
          </div>
        )}
      </div>
      {showSaveInput && (
        <div className="playlist-save-form">
          <input className="playlist-name-input" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Playlist-Name..." maxLength={50} onKeyDown={e => e.key === 'Enter' && savePlaylist()} autoFocus />
          <button className="btn-playlist-save" onClick={savePlaylist} disabled={savingPlaylist || !playlistName.trim()}>
            {savingPlaylist ? '...' : 'Save'}
          </button>
        </div>
      )}
      {state.tracks.length === 0 ? (
        <div className="empty-state">
          {Icons.music}
          <p>Queue is empty</p>
          <p className="empty-hint">Search for songs to add them</p>
        </div>
      ) : (
        <div className="track-list">
          {state.tracks.map((track, i) => (
            <TrackRow key={i} track={track} index={i} onRemove={() => removeFromQueue(i)} draggable />
          ))}
        </div>
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
          <p>No liked songs yet</p>
          <p className="empty-hint">Click the heart icon on any song to save it here</p>
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

  const renderPlaylists = () => (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">Playlists</h2>
        <button className="btn-icon" onClick={() => setShowSaveInput(!showSaveInput)} title="Save current queue">{Icons.add}</button>
      </div>
      {showSaveInput && (
        <div className="playlist-save-form">
          <input className="playlist-name-input" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Playlist-Name..." maxLength={50} onKeyDown={e => e.key === 'Enter' && savePlaylist()} autoFocus />
          <button className="btn-playlist-save" onClick={savePlaylist} disabled={savingPlaylist || !playlistName.trim()}>
            {savingPlaylist ? '...' : 'Save'}
          </button>
        </div>
      )}
      {playlists.length === 0 ? (
        <div className="empty-state">
          {Icons.playlist}
          <p>No playlists yet</p>
          <p className="empty-hint">Save your current queue as a playlist</p>
        </div>
      ) : (
        <div className="playlist-grid">
          {playlists.map(p => (
            <div key={p.id} className="playlist-card-lg">
              <div className="playlist-card-lg-top" onClick={() => loadPlaylist(p.id)}>
                <div className="playlist-card-lg-icon">{Icons.playlist}</div>
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
    </section>
  );

  const renderSearch = () => {
    if (searching) return <div className="search-loading"><span className="adding-spinner large" /> Searching...</div>;
    if (searchResults.length === 0) return null;

    // Group by artist
    const artists = {};
    searchResults.forEach(t => {
      if (t.artist) {
        if (!artists[t.artist]) artists[t.artist] = { name: t.artist, thumb: t.thumbnail, tracks: [] };
        artists[t.artist].tracks.push(t);
      }
    });
    const topArtist = Object.values(artists)[0];

    return (
      <>
        <div className="search-results-header">
          <h2 className="section-title">Results for "{searchQuery}"</h2>
          <button className="btn-close-results" onClick={() => { setSearchResults([]); setActiveView('home'); }}>Close</button>
        </div>

        {topArtist && (
          <section className="content-section">
            <h3 className="subsection-title">Artist</h3>
            <div className="artist-card">
              <div className="artist-card-avatar">
                {topArtist.thumb ? <img src={topArtist.thumb} alt="" /> : <div className="artist-card-placeholder">{topArtist.name[0]}</div>}
              </div>
              <div className="artist-card-info">
                <span className="artist-card-name">{topArtist.name}</span>
                <span className="artist-card-type">Artist</span>
              </div>
            </div>
          </section>
        )}

        <section className="content-section">
          <h3 className="subsection-title">Songs</h3>
          <div className="track-list">
            {searchResults.map((track, i) => (
              <TrackRow key={i} track={track} index={i} />
            ))}
          </div>
        </section>
      </>
    );
  };

  // ── Main Render ────────────────────────────────────────────────
  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-icon">{Icons.equalizer}</div>
            <span className="brand-text">BeatByte</span>
          </div>
          <button className="btn-collapse" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{Icons.collapse}</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item${activeView === item.id ? ' active' : ''}`} onClick={() => { setActiveView(item.id); setSearchResults([]); }}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {guild && (
          <div className="sidebar-guild">
            <div className="sidebar-label">Server</div>
            <div className="guild-active">
              {guild.icon ? <img src={guild.icon} alt="" className="guild-icon" /> : <div className="guild-placeholder">{guild.name[0]}</div>}
              <span className="guild-name">{guild.name}</span>
            </div>
          </div>
        )}

        {state.connected && (
          <div className="sidebar-voice">
            <div className="voice-status-dot" />
            <span className="voice-label">Connected</span>
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
            <input className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search songs or artists..." disabled={searching} />
            {searchQuery && <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); if (activeView === 'search') setActiveView('home'); }}>{Icons.close}</button>}
          </div>
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
                    <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); }}>
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
           activeView === 'playlists' ? renderPlaylists() :
           renderHome()}
        </div>
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
                <input type="range" className="volume-slider" min="0" max="200" value={state.volume} onChange={e => apiAction('volume', { volume: e.target.value })} title={`${state.volume}%`} />
              </div>
            </div>
          </>
        ) : (
          <div className="player-empty">No song playing</div>
        )}
      </footer>
    </div>
  );
}

export default App;

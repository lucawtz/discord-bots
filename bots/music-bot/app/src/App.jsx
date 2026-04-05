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

  useEffect(() => {
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

  const connectWebSocket = (authToken) => {
    wsRef.current?.close();
    const wsUrl = botUrl.replace(/^http/, 'ws') + `?token=${authToken}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.data?.guildId === guildRef.current?.id) setState(msg.data);
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
    setState({ current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 });
    localStorage.removeItem('authToken');
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

  const totalDuration = state.current ? parseDuration(state.current.duration) : 0;
  const progress = totalDuration > 0 ? Math.min((localElapsed / totalDuration) * 100, 100) : 0;
  const loopIcons = { off: 'Off', song: 'Song', queue: 'Queue' };

  // ── Setup Screen ───────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="setup-logo">
            <div className="setup-logo-icon">{Icons.equalizer}</div>
          </div>
          <h1>BeatByte</h1>
          <p className="setup-subtitle">Steuere deine Musik direkt im Browser</p>
          <div className="setup-form">
            <label>Zugangs-Code</label>
            <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="Code eingeben" maxLength={12} className="code-input" onKeyDown={e => e.key === 'Enter' && connect()} autoFocus />
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

      {state.tracks.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Up Next <span className="badge">{state.tracks.length}</span></h2>
          <div className="card-scroll">
            {state.tracks.slice(0, 8).map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Your Playlists</h2>
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

      {recentlyPlayed.length > 0 && (
        <section className="content-section">
          <h2 className="section-title">Recently Played</h2>
          <div className="card-scroll">
            {recentlyPlayed.slice(0, 10).map((track, i) => <TrackCard key={i} track={track} />)}
          </div>
        </section>
      )}

      {!state.current && state.tracks.length === 0 && recentlyPlayed.length === 0 && playlists.length === 0 && channels.length === 0 && (
        <div className="empty-state">
          {Icons.music}
          <p>Willkommen bei BeatByte</p>
          <p className="empty-hint">Suche oben nach einem Song, um loszulegen</p>
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

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

  const wsRef = useRef(null);
  const guildRef = useRef(null);

  useEffect(() => { guildRef.current = guild; }, [guild]);

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

  // Auto-reconnect on app load if token exists
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
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch {
        logout();
      }
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
    } catch (err) {
      setError(err.message);
    }
    setConnecting(false);
  };

  const logout = () => {
    if (token) {
      fetch(`${botUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    wsRef.current?.close();
    setConnected(false);
    setToken('');
    setGuild(null);
    setAccessCode('');
    setState({ current: null, tracks: [], paused: false, connected: false, loopMode: 'off', volume: 100, elapsed: 0 });
    localStorage.removeItem('authToken');
  };

  // Poll state
  useEffect(() => {
    if (!connected || !guild) return;
    fetchState(guild.id);
    const interval = setInterval(() => fetchState(guild.id), 3000);
    return () => clearInterval(interval);
  }, [connected, guild, fetchState]);

  // Fetch channels when bot is not in a voice channel
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

  const totalDuration = state.current ? parseDuration(state.current.duration) : 0;
  const progress = totalDuration > 0 ? Math.min((localElapsed / totalDuration) * 100, 100) : 0;
  const loopIcons = { off: 'Off', song: 'Song', queue: 'Queue' };

  // ── Setup Screen ───────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="setup-logo">
            <div className="setup-logo-icon">
              <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          </div>
          <h1>BeatByte</h1>
          <p className="setup-subtitle">Steuere deine Musik direkt im Browser</p>
          <div className="setup-form">
            <label>Zugangs-Code</label>
            <input
              value={accessCode}
              onChange={e => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Code eingeben"
              maxLength={8}
              className="code-input"
              onKeyDown={e => e.key === 'Enter' && connect()}
              autoFocus
            />
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

  // ── Hauptansicht ───────────────────────────────────────────────
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </div>
          <span>BeatByte</span>
        </div>
        {guild && (
          <>
            <div className="sidebar-label">Server</div>
            <div className="guild-active">
              {guild.icon
                ? <img src={guild.icon} alt="" className="guild-icon" />
                : <div className="guild-placeholder">{guild.name[0]}</div>
              }
              <span className="guild-name">{guild.name}</span>
            </div>
          </>
        )}
        <div className="sidebar-bottom">
          <button className="btn-disconnect" onClick={logout}>Abmelden</button>
        </div>
      </aside>

      <main className="main">
        <header className="top-bar">
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Song suchen..." disabled={searching} />
            <button className="btn-search" onClick={search} disabled={searching || !searchQuery.trim()}>{searching ? 'Suche...' : 'Suchen'}</button>
          </div>
        </header>

        {state.connected && (
          <div className="voice-status">
            <div className="voice-status-dot" />
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>
            <span>Verbunden</span>
          </div>
        )}

        {!state.connected && channels.length > 0 && (
          <section className="channel-section">
            <h2 className="section-title">Voice Channel beitreten</h2>
            <div className="channel-list">
              {channels.map(ch => (
                <button key={ch.id} className="channel-item" onClick={() => joinChannel(ch.id)} disabled={joiningChannel === ch.id}>
                  <svg className="channel-icon-svg" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>
                  <span className="channel-name">{ch.name}</span>
                  {ch.members > 0 && <span className="channel-members">{ch.members} drin</span>}
                  <span className="channel-join">{joiningChannel === ch.id ? 'Verbinde...' : 'Beitreten'}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {error && <div className="error-banner" onClick={() => setError('')}>{error}</div>}

        {searchResults.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <h2 className="section-title">Suchergebnisse</h2>
              <button className="btn-close-results" onClick={() => setSearchResults([])}>Schließen</button>
            </div>
            <div className="results-list">
              {searchResults.map((track, i) => (
                <div key={i} className="result-item">
                  <div className="result-thumb-wrap">
                    {track.thumbnail ? <img src={track.thumbnail} alt="" className="result-thumb" /> : <div className="result-thumb-empty" />}
                  </div>
                  <div className="result-details">
                    <span className="result-title">{track.title}</span>
                    <span className="result-meta">{track.duration}</span>
                  </div>
                  <button className="btn-add" onClick={() => addToQueue(track)} disabled={adding === track.url} title="Zur Warteschlange">
                    {adding === track.url ? <span className="adding-spinner" /> : <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {state.current && (
          <section className="now-playing-section">
            <h2 className="section-title">Spielt jetzt</h2>
            <div className="now-playing-card">
              <div className="np-visualizer">
                {!state.paused && <><span className="np-bar" /><span className="np-bar" /><span className="np-bar" /><span className="np-bar" /></>}
              </div>
              {state.current.thumbnail && <img src={state.current.thumbnail} alt="" className="np-cover" />}
              <div className="np-info">
                <span className="np-title">{state.current.title}</span>
                <span className="np-meta">{state.current.requestedBy && `${state.current.requestedBy}`}</span>
                <div className="np-progress">
                  <span className="np-time">{fmtTime(localElapsed)}</span>
                  <div className="np-progress-bar"><div className="np-progress-fill" style={{ width: `${progress}%` }} /></div>
                  <span className="np-time">{state.current.duration}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="queue-section">
          <div className="queue-header">
            <h2 className="section-title">
              Warteschlange
              {state.tracks.length > 0 && <span className="queue-count">{state.tracks.length}</span>}
            </h2>
          </div>
          {state.tracks.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" className="empty-icon"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" opacity="0.3"/></svg>
              <p>Keine Songs in der Warteschlange</p>
              <p className="empty-hint">Suche oben nach einem Song</p>
            </div>
          ) : (
            <div className="queue-list">
              {state.tracks.map((track, i) => (
                <div key={i} className="queue-item">
                  <span className="queue-num">{i + 1}</span>
                  <div className="queue-thumb-wrap">
                    {track.thumbnail ? <img src={track.thumbnail} alt="" className="queue-thumb" /> : <div className="queue-thumb-empty" />}
                  </div>
                  <div className="queue-details">
                    <span className="queue-title">{track.title}</span>
                    <span className="queue-meta">{track.duration}</span>
                  </div>
                  <button className="btn-remove" onClick={() => removeFromQueue(i)} title="Entfernen">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Player Bar */}
      <footer className={`player-bar ${state.current ? 'active' : ''}`}>
        {state.current ? (
          <>
            <div className="player-track">
              {state.current.thumbnail && <img src={state.current.thumbnail} alt="" className="player-cover" />}
              <div className="player-info">
                <span className="player-title">{state.current.title}</span>
                <span className="player-meta">{fmtTime(localElapsed)} / {state.current.duration}</span>
              </div>
            </div>
            <div className="player-controls">
              <button className="ctrl-btn" onClick={() => apiAction('shuffle')} title="Mischen">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              </button>
              <button className="ctrl-btn ctrl-main" onClick={() => apiAction('pause')} title={state.paused ? 'Fortsetzen' : 'Pausieren'}>
                {state.paused
                  ? <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                  : <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                }
              </button>
              <button className="ctrl-btn" onClick={() => apiAction('skip')} title="Überspringen">
                <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button className={`ctrl-btn ${state.loopMode !== 'off' ? 'ctrl-active' : ''}`} onClick={() => apiAction('loop')} title={`Loop: ${loopIcons[state.loopMode]}`}>
                {state.loopMode === 'song' ? (
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">1</text></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                )}
              </button>
              <button className="ctrl-btn ctrl-stop" onClick={() => apiAction('stop')} title="Stoppen">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
              </button>
            </div>
            <div className="player-right">
              <a className="ctrl-btn" href={`https://www.google.com/search?q=${encodeURIComponent(state.current.title + ' lyrics')}`} target="_blank" rel="noopener noreferrer" title="Lyrics suchen">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>
              </a>
              <div className="volume-control">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                <input type="range" className="volume-slider" min="0" max="200" value={state.volume} onChange={e => apiAction('volume', { volume: e.target.value })} title={`${state.volume}%`} />
              </div>
            </div>
          </>
        ) : (
          <div className="player-empty">Kein Song wird abgespielt</div>
        )}
      </footer>
    </div>
  );
}

export default App;

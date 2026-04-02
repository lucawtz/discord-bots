import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_URL = 'http://localhost:3000';

function App() {
  const [botUrl, setBotUrl] = useState(localStorage.getItem('botUrl') || DEFAULT_URL);
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [connected, setConnected] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [state, setState] = useState({ current: null, tracks: [], paused: false, connected: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const [channels, setChannels] = useState([]);
  const [joiningChannel, setJoiningChannel] = useState(null);
  const [error, setError] = useState('');

  const wsRef = useRef(null);
  const selectedGuildRef = useRef(null);

  useEffect(() => { selectedGuildRef.current = selectedGuild; }, [selectedGuild]);

  const getHeaders = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (apiKey) h['X-API-Key'] = apiKey;
    return h;
  }, [apiKey]);

  const fetchState = useCallback(async (guildId) => {
    if (!guildId) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${guildId}/state`, { headers: getHeaders() });
      if (res.ok) setState(await res.json());
    } catch {}
  }, [botUrl, getHeaders]);

  // Verbinden
  const connect = async () => {
    setError('');
    try {
      const res = await fetch(`${botUrl}/api/guilds`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGuilds(data);
      setConnected(true);
      localStorage.setItem('botUrl', botUrl);
      localStorage.setItem('apiKey', apiKey);

      const wsUrl = botUrl.replace(/^http/, 'ws');
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.data?.guildId === selectedGuildRef.current?.id) {
            setState(msg.data);
          }
        } catch {}
      };
      ws.onclose = () => {};
      wsRef.current = ws;
    } catch {
      setError('Verbindung fehlgeschlagen. Ist der Bot gestartet?');
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    setConnected(false);
    setGuilds([]);
    setSelectedGuild(null);
    setState({ current: null, tracks: [], paused: false, connected: false });
  };

  // State alle 2s pollen (Fallback)
  useEffect(() => {
    if (!connected || !selectedGuild) return;
    fetchState(selectedGuild.id);
    const interval = setInterval(() => fetchState(selectedGuild.id), 2000);
    return () => clearInterval(interval);
  }, [connected, selectedGuild, fetchState]);

  // Voice Channels laden wenn Bot nicht verbunden
  useEffect(() => {
    if (!connected || !selectedGuild || state.connected) { setChannels([]); return; }
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${botUrl}/api/guild/${selectedGuild.id}/channels`, { headers: getHeaders() });
        if (res.ok) setChannels(await res.json());
      } catch {}
    };
    fetchChannels();
  }, [connected, selectedGuild, state.connected, botUrl, getHeaders]);

  // Bot einem Channel joinen lassen
  const joinChannel = async (channelId) => {
    if (!selectedGuild) return;
    setJoiningChannel(channelId);
    try {
      const res = await fetch(`${botUrl}/api/guild/${selectedGuild.id}/join`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchState(selectedGuild.id);
    } catch (err) {
      setError(err.message);
    }
    setJoiningChannel(null);
  };

  // Songs suchen (zeigt Ergebnisse)
  const search = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setError('');
    try {
      const res = await fetch(`${botUrl}/api/search?q=${encodeURIComponent(searchQuery)}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data);
    } catch (err) {
      setError(err.message);
    }
    setSearching(false);
  };

  // Song aus Suchergebnissen zur Queue hinzufügen
  const addToQueue = async (track) => {
    if (!selectedGuild) return;
    setAdding(track.url);
    try {
      const res = await fetch(`${botUrl}/api/guild/${selectedGuild.id}/play`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query: track.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchState(selectedGuild.id);
    } catch (err) {
      setError(err.message);
    }
    setAdding(null);
  };

  // API-Aktionen
  const apiAction = async (action) => {
    if (!selectedGuild) return;
    try {
      const res = await fetch(`${botUrl}/api/guild/${selectedGuild.id}/${action}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) fetchState(selectedGuild.id);
    } catch {}
  };

  const removeFromQueue = async (index) => {
    if (!selectedGuild) return;
    try {
      await fetch(`${botUrl}/api/guild/${selectedGuild.id}/queue/${index}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      fetchState(selectedGuild.id);
    } catch {}
  };

  // ── Setup Screen ───────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="setup-icon">&#9835;</div>
          <h1>Discord Music Bot</h1>
          <p className="setup-subtitle">Verbinde dich mit deinem Bot</p>
          <div className="setup-form">
            <label>Bot URL</label>
            <input
              value={botUrl}
              onChange={e => setBotUrl(e.target.value)}
              placeholder="http://localhost:3000"
              onKeyDown={e => e.key === 'Enter' && connect()}
            />
            <label>API Key <span className="optional">(optional)</span></label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Dein API Key"
              type="password"
              onKeyDown={e => e.key === 'Enter' && connect()}
            />
            <button className="btn-connect" onClick={connect}>Verbinden</button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Hauptansicht ───────────────────────────────────────────────
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">&#9835;</span>
          <span>Music Bot</span>
        </div>
        <div className="sidebar-label">Server</div>
        <nav className="guild-list">
          {guilds.map(g => (
            <button
              key={g.id}
              className={`guild-item ${selectedGuild?.id === g.id ? 'active' : ''}`}
              onClick={() => setSelectedGuild(g)}
            >
              {g.icon
                ? <img src={g.icon} alt="" className="guild-icon" />
                : <div className="guild-placeholder">{g.name[0]}</div>
              }
              <span className="guild-name">{g.name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="btn-disconnect" onClick={disconnect}>Trennen</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {selectedGuild ? (
          <>
            {/* Suchleiste */}
            <header className="top-bar">
              <div className="search-container">
                <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  className="search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="Song suchen..."
                  disabled={searching}
                />
                <button
                  className="btn-search"
                  onClick={search}
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? 'Suche...' : 'Suchen'}
                </button>
              </div>
            </header>

            {!state.connected && channels.length > 0 && (
              <section className="channel-section">
                <h2 className="section-title">Voice Channel beitreten</h2>
                <div className="channel-list">
                  {channels.map(ch => (
                    <button
                      key={ch.id}
                      className="channel-item"
                      onClick={() => joinChannel(ch.id)}
                      disabled={joiningChannel === ch.id}
                    >
                      <svg className="channel-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/>
                      </svg>
                      <span className="channel-name">{ch.name}</span>
                      {ch.members > 0 && <span className="channel-members">{ch.members} drin</span>}
                      <span className="channel-join">
                        {joiningChannel === ch.id ? 'Verbinde...' : 'Beitreten'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {error && <div className="error-banner" onClick={() => setError('')}>{error}</div>}

            {/* Suchergebnisse */}
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
                        {track.thumbnail
                          ? <img src={track.thumbnail} alt="" className="result-thumb" />
                          : <div className="result-thumb-empty" />
                        }
                      </div>
                      <div className="result-details">
                        <span className="result-title">{track.title}</span>
                        <span className="result-meta">{track.duration}</span>
                      </div>
                      <button
                        className="btn-add"
                        onClick={() => addToQueue(track)}
                        disabled={adding === track.url}
                        title="Zur Warteschlange hinzufügen"
                      >
                        {adding === track.url ? (
                          <span className="adding-spinner">...</span>
                        ) : (
                          <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Warteschlange */}
            <section className="queue-section">
              <h2 className="section-title">Warteschlange</h2>
              {state.tracks.length === 0 ? (
                <div className="empty-state">
                  <p>Keine Songs in der Warteschlange</p>
                  <p className="empty-hint">Suche oben nach einem Song, um loszulegen</p>
                </div>
              ) : (
                <div className="queue-list">
                  {state.tracks.map((track, i) => (
                    <div key={i} className="queue-item">
                      <span className="queue-num">{i + 1}</span>
                      <div className="queue-thumb-wrap">
                        {track.thumbnail
                          ? <img src={track.thumbnail} alt="" className="queue-thumb" />
                          : <div className="queue-thumb-empty" />
                        }
                      </div>
                      <div className="queue-details">
                        <span className="queue-title">{track.title}</span>
                        <span className="queue-meta">{track.duration}</span>
                      </div>
                      <button className="btn-remove" onClick={() => removeFromQueue(i)} title="Entfernen">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="no-selection">
            <div className="no-selection-icon">&#9835;</div>
            <h2>Wähle einen Server</h2>
            <p>Wähle einen Server aus der Seitenleiste, um loszulegen</p>
          </div>
        )}
      </main>

      {/* Player Bar */}
      <footer className={`player-bar ${state.current ? 'active' : ''}`}>
        {state.current ? (
          <>
            <div className="player-track">
              {state.current.thumbnail && (
                <img src={state.current.thumbnail} alt="" className="player-cover" />
              )}
              <div className="player-info">
                <span className="player-title">{state.current.title}</span>
                <span className="player-meta">{state.current.duration}</span>
              </div>
            </div>
            <div className="player-controls">
              <button
                className="ctrl-btn ctrl-main"
                onClick={() => apiAction('pause')}
                title={state.paused ? 'Fortsetzen' : 'Pausieren'}
              >
                {state.paused ? (
                  <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                )}
              </button>
              <button className="ctrl-btn" onClick={() => apiAction('skip')} title="Überspringen">
                <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button className="ctrl-btn ctrl-stop" onClick={() => apiAction('stop')} title="Stoppen">
                <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
              </button>
            </div>
            <div className="player-end" />
          </>
        ) : (
          <div className="player-empty">Kein Song wird abgespielt</div>
        )}
      </footer>
    </div>
  );
}

export default App;

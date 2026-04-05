import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { API_BASE, WS_BASE } from '../config';
import { useAuth } from './AuthContext';

const PlayerContext = createContext(null);

// Parse duration string "3:42" or "1:02:30" to seconds
function parseDuration(val) {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    const parts = val.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

// Extract duration in seconds from a track object
function getTrackDurationSec(track) {
    if (!track) return 0;
    if (track.durationSec) return track.durationSec;
    return parseDuration(track.duration);
}

// Map API guild state to our internal state
function mapGuildState(d) {
    return {
        playing: !!d.current,
        paused: d.paused || false,
        currentSong: d.current || null,
        queue: (d.tracks || []).map(t => ({ ...t, durationSec: getTrackDurationSec(t) })),
        position: d.elapsed || 0,
        duration: getTrackDurationSec(d.current),
        volume: d.volume ?? 100,
        loopMode: d.loopMode || 'off',
        connected: d.connected || false,
    };
}

const initialState = {
    connected: false,
    playing: false,
    paused: false,
    currentSong: null,
    queue: [],
    position: 0,
    duration: 0,
    volume: 100,
    loopMode: 'off',
};

function playerReducer(state, action) {
    switch (action.type) {
        case 'SET_STATE':
            return { ...state, ...action.payload };
        case 'SET_CONNECTED':
            return { ...state, connected: action.payload };
        case 'SET_POSITION':
            return { ...state, position: action.payload };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}

export function PlayerProvider({ children }) {
    const [state, dispatch] = useReducer(playerReducer, initialState);
    const { token, guildId } = useAuth();
    const wsRef = useRef(null);
    const positionRef = useRef(state.position);

    // Keep ref in sync for the timer
    positionRef.current = state.position;

    // Track elapsed time locally (increment every second while playing)
    useEffect(() => {
        if (!state.playing || state.paused || !state.currentSong) return;
        const timer = setInterval(() => {
            positionRef.current += 1;
            dispatch({ type: 'SET_POSITION', payload: positionRef.current });
        }, 1000);
        return () => clearInterval(timer);
    }, [state.playing, state.paused, state.currentSong]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!token || !guildId) {
            dispatch({ type: 'RESET' });
            return;
        }

        const ws = new WebSocket(`${WS_BASE}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
            // Authenticate via message instead of URL params (security)
            ws.send(JSON.stringify({ type: 'auth', token }));
        };
        ws.onclose = () => dispatch({ type: 'SET_CONNECTED', payload: false });

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event === 'authenticated') {
                    dispatch({ type: 'SET_CONNECTED', payload: true });
                } else if (msg.event === 'stateUpdate' && msg.data) {
                    dispatch({ type: 'SET_STATE', payload: mapGuildState(msg.data) });
                }
            } catch { /* ignore */ }
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [token, guildId]);

    // Fetch initial state when guild selected
    useEffect(() => {
        if (!token || !guildId) return;
        fetch(`${API_BASE}/api/guild/${guildId}/state`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => dispatch({ type: 'SET_STATE', payload: mapGuildState(data) }))
            .catch(() => {});
    }, [token, guildId]);

    // API actions
    const apiAction = useCallback(async (endpoint, method = 'POST', body = null) => {
        if (!token || !guildId) return null;
        const opts = {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}/api/guild/${guildId}${endpoint}`, opts);
        return res.ok ? res.json() : null;
    }, [token, guildId]);

    const play = useCallback((query) => apiAction('/play', 'POST', { query }), [apiAction]);
    const pause = useCallback(() => apiAction('/pause'), [apiAction]);
    const skip = useCallback(() => apiAction('/skip'), [apiAction]);
    const stop = useCallback(() => apiAction('/stop'), [apiAction]);
    const shuffle = useCallback(() => apiAction('/shuffle'), [apiAction]);
    const loop = useCallback(() => apiAction('/loop'), [apiAction]);
    const setVolume = useCallback((vol) => apiAction('/volume', 'POST', { volume: vol }), [apiAction]);
    const seek = useCallback((pos) => apiAction('/seek', 'POST', { position: pos }), [apiAction]);
    const removeFromQueue = useCallback((index) => apiAction(`/queue/${index}`, 'DELETE'), [apiAction]);

    return (
        <PlayerContext.Provider value={{
            ...state,
            play, pause, skip, stop, shuffle, loop,
            setVolume, seek, removeFromQueue,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}

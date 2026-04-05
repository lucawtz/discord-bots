import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guildId, setGuildId] = useState(() => localStorage.getItem('bb_guildId'));
    const [guild, setGuild] = useState(null);
    const [voiceStatus, setVoiceStatus] = useState(null);

    // OAuth flow state
    const [oauthPending, setOauthPending] = useState(null); // { oauthToken, user, guilds }

    const token = localStorage.getItem('bb_token');
    const isGuest = user?.authType === 'code';
    const isAuthenticated = !!user;

    // Verify stored session on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        fetch(`${API_BASE}/api/auth/verify`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                setUser({
                    id: data.userId,
                    username: data.username || 'Guest',
                    avatar: data.avatar || null,
                    authType: data.authType || 'code',
                });
                if (data.guild) {
                    setGuild(data.guild);
                    if (!guildId) {
                        setGuildId(data.guild.id);
                        localStorage.setItem('bb_guildId', data.guild.id);
                    }
                }
            })
            .catch(() => {
                localStorage.removeItem('bb_token');
                localStorage.removeItem('bb_guildId');
            })
            .finally(() => setLoading(false));
    }, [token]);

    // Handle OAuth redirect (token via sessionStorage, not URL)
    useEffect(() => {
        const discordToken = sessionStorage.getItem('discord_oauth_token');
        if (!discordToken) return;

        // Clean up
        sessionStorage.removeItem('discord_oauth_token');

        // Fetch pending OAuth data
        fetch(`${API_BASE}/api/auth/discord/guilds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oauthToken: discordToken }),
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                if (data.guilds.length === 1) {
                    // Auto-select if only one guild
                    completeOAuthLogin(discordToken, data.guilds[0].id);
                } else {
                    // Show guild selector
                    setOauthPending({ oauthToken: discordToken, user: data.user, guilds: data.guilds });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Complete OAuth login by selecting a guild
    const completeOAuthLogin = useCallback(async (oauthToken, selectedGuildId) => {
        const res = await fetch(`${API_BASE}/api/auth/discord/select`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oauthToken, guildId: selectedGuildId }),
        });
        if (!res.ok) throw new Error('Guild selection failed');
        const data = await res.json();
        localStorage.setItem('bb_token', data.token);
        localStorage.setItem('bb_guildId', selectedGuildId);
        setGuildId(selectedGuildId);
        setGuild(data.guild);
        setUser({
            id: data.user.id,
            username: data.user.username,
            avatar: data.user.avatar,
            authType: 'discord',
        });
        setOauthPending(null);
    }, []);

    // Select guild from OAuth pending state
    const selectOAuthGuild = useCallback(async (selectedGuildId) => {
        if (!oauthPending) return;
        await completeOAuthLogin(oauthPending.oauthToken, selectedGuildId);
    }, [oauthPending, completeOAuthLogin]);

    // Login with access code
    const loginWithCode = useCallback(async (code) => {
        const res = await fetch(`${API_BASE}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Login fehlgeschlagen');
        }
        const data = await res.json();
        localStorage.setItem('bb_token', data.token);
        if (data.guild) {
            localStorage.setItem('bb_guildId', data.guild.id);
            setGuildId(data.guild.id);
            setGuild(data.guild);
        }
        setUser({
            id: null,
            username: 'Guest',
            avatar: null,
            authType: 'code',
        });
        return data;
    }, []);

    // Login with Discord OAuth
    const loginWithDiscord = useCallback(() => {
        window.location.href = `${API_BASE}/api/auth/discord`;
    }, []);

    // Select guild (for switching)
    const selectGuild = useCallback((id) => {
        localStorage.setItem('bb_guildId', id);
        setGuildId(id);
    }, []);

    // Logout
    const logout = useCallback(async () => {
        if (token) {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
        localStorage.removeItem('bb_token');
        localStorage.removeItem('bb_guildId');
        setUser(null);
        setGuildId(null);
        setGuild(null);
        setVoiceStatus(null);
    }, [token]);

    // Poll voice status every 15s when authenticated
    useEffect(() => {
        if (!token || !guildId) {
            setVoiceStatus(null);
            return;
        }

        const fetchVoiceStatus = () => {
            fetch(`${API_BASE}/api/guild/${guildId}/voice-status`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data) setVoiceStatus(data); })
                .catch(() => {});
        };

        fetchVoiceStatus();
        const interval = setInterval(fetchVoiceStatus, 15_000);
        return () => clearInterval(interval);
    }, [token, guildId]);

    return (
        <AuthContext.Provider value={{
            user, loading, isGuest, isAuthenticated, token, guildId, guild, voiceStatus,
            oauthPending, selectOAuthGuild,
            loginWithCode, loginWithDiscord,
            selectGuild, logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

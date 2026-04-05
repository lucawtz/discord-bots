import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Card, CardContent, IconButton } from '@mui/material';
import { Link, Outlet, useLocation } from 'react-router-dom';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

export default function Library() {
    const location = useLocation();
    const isRoot = location.pathname === '/app/library';
    const { token, guildId } = useAuth();
    const { play } = usePlayer();

    const [likeCount, setLikeCount] = useState(0);
    const [historyCount, setHistoryCount] = useState(0);
    const [playlists, setPlaylists] = useState([]);
    const [recentHistory, setRecentHistory] = useState([]);

    useEffect(() => {
        if (!isRoot || !token || !guildId) return;

        // Fetch counts and recent data in parallel
        Promise.all([
            fetch(`${API_BASE}/api/guild/${guildId}/likes`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : []),
            fetch(`${API_BASE}/api/guild/${guildId}/history?limit=6`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : []),
            fetch(`${API_BASE}/api/guild/${guildId}/playlists`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : []),
        ]).then(([likes, history, pls]) => {
            setLikeCount(likes.length);
            setHistoryCount(history.length);
            setRecentHistory(history);
            setPlaylists(pls);
        }).catch(() => {});
    }, [isRoot, token, guildId]);

    if (!isRoot) return <Outlet />;

    const sections = [
        { label: 'Gelikte Songs', icon: <FavoriteIcon />, path: '/app/library/likes', count: likeCount, color: '#f0a0ee' },
        { label: 'Playlists', icon: <QueueMusicIcon />, path: '/app/library', count: playlists.length, color: '#08fcfe' },
        { label: 'Verlauf', icon: <HistoryIcon />, path: '/app/library/history', count: historyCount, color: '#ffa726' },
    ];

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, mt: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                Deine Bibliothek
            </Typography>

            {/* Quick Access Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 1.5,
                mb: 5,
            }}>
                {sections.map((s) => (
                    <Card
                        key={s.path}
                        component={Link}
                        to={s.path}
                        sx={{
                            textDecoration: 'none',
                            bgcolor: `${s.color}08`,
                            border: '1px solid', borderColor: `${s.color}18`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: `${s.color}14`,
                                transform: 'translateY(-2px)',
                                borderColor: `${s.color}30`,
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ color: s.color, mb: 1.5, '& svg': { fontSize: 28 } }}>
                                {s.icon}
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {s.label}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                {s.count} {s.count === 1 ? 'Eintrag' : 'Eintraege'}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Playlists */}
            <Box sx={{ mb: 5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        Deine Playlists
                    </Typography>
                    <IconButton size="small" sx={{
                        color: 'text.disabled', bgcolor: 'rgba(255,255,255,0.06)',
                        '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.1)' },
                    }}>
                        <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Stack>
                {playlists.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                        <QueueMusicIcon sx={{ fontSize: 40, opacity: 0.08, mb: 1 }} />
                        <Typography variant="body2" color="text.disabled">
                            Noch keine Playlists
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            Speichere deine Queue als Playlist mit /playlist in Discord
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0.5}>
                        {playlists.map((pl) => (
                            <Stack key={pl.id} direction="row" alignItems="center" spacing={1.5} sx={{
                                p: 1.5, borderRadius: 1.5,
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                cursor: 'pointer', transition: 'background 0.15s',
                            }}>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: 1,
                                    bgcolor: 'rgba(8,252,254,0.06)', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <QueueMusicIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.5 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {pl.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {pl.track_count} Songs
                                    </Typography>
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Box>

            {/* Recent History */}
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        Zuletzt gehoert
                    </Typography>
                    {recentHistory.length > 0 && (
                        <Typography component={Link} to="/app/library/history" variant="body2" sx={{
                            color: 'text.secondary', textDecoration: 'none',
                            '&:hover': { color: 'text.primary' },
                        }}>
                            Alle anzeigen
                        </Typography>
                    )}
                </Stack>
                {recentHistory.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                        <HistoryIcon sx={{ fontSize: 40, opacity: 0.08, mb: 1 }} />
                        <Typography variant="body2" color="text.disabled">
                            Noch kein Verlauf vorhanden
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0.25}>
                        {recentHistory.map((track, i) => (
                            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                                p: 1, borderRadius: 1.5, cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                transition: 'background 0.15s',
                            }}
                                onClick={() => play(track.track_url)}
                            >
                                <Box sx={{
                                    width: 40, height: 40, borderRadius: 1,
                                    bgcolor: '#252532', flexShrink: 0,
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {track.thumbnail ? (
                                        <Box component="img" src={track.thumbnail} alt=""
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <MusicNoteIcon sx={{ fontSize: 18, opacity: 0.2 }} />
                                    )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{
                                        fontWeight: 500, fontSize: '0.85rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {track.track_title}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {track.artist || 'Unbekannt'}
                                    </Typography>
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

import { useState, useEffect } from 'react';
import { Box, Typography, Stack, IconButton, CircularProgress, Button } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

function formatDuration(val) {
    if (typeof val === 'string' && val.includes(':')) return val;
    if (typeof val === 'number') {
        const m = Math.floor(val / 60);
        const s = Math.floor(val % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return '';
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'Z'); // SQLite datetime is UTC
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
    if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function History() {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token, guildId } = useAuth();
    const { play } = usePlayer();

    useEffect(() => {
        if (!token || !guildId) return;
        fetch(`${API_BASE}/api/guild/${guildId}/history?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : [])
            .then(setTracks)
            .finally(() => setLoading(false));
    }, [token, guildId]);

    const handleClear = async () => {
        await fetch(`${API_BASE}/api/guild/${guildId}/history`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        setTracks([]);
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4, mt: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: 2,
                        background: 'linear-gradient(135deg, #ffa726, #ff7043)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <HistoryIcon sx={{ fontSize: 28, color: 'white' }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Verlauf</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Zuletzt gehoerte Songs
                        </Typography>
                    </Box>
                </Stack>
                {tracks.length > 0 && (
                    <Button
                        size="small" startIcon={<DeleteSweepIcon />}
                        onClick={handleClear}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                    >
                        Loeschen
                    </Button>
                )}
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                </Box>
            ) : tracks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <HistoryIcon sx={{ fontSize: 56, opacity: 0.08, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Noch kein Verlauf
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        Gehoerte Songs erscheinen hier automatisch.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={0.25}>
                    {tracks.map((track, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                            p: 1, borderRadius: 1.5, cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                            transition: 'background 0.15s',
                        }}
                            onClick={() => play(track.track_url)}
                        >
                            <Box sx={{
                                width: 44, height: 44, borderRadius: 1,
                                bgcolor: '#252532', flexShrink: 0,
                                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {track.thumbnail ? (
                                    <Box component="img" src={track.thumbnail} alt=""
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <MusicNoteIcon sx={{ fontSize: 20, opacity: 0.2 }} />
                                )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontWeight: 600, fontSize: '0.88rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {track.track_title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {track.artist || 'Unbekannt'}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}>
                                {formatDuration(track.duration)}
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: 'text.disabled', fontSize: '0.7rem', flexShrink: 0,
                                display: { xs: 'none', sm: 'block' }, minWidth: 80, textAlign: 'right',
                            }}>
                                {timeAgo(track.played_at)}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Box>
    );
}

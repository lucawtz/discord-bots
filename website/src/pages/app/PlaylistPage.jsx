import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Stack, IconButton, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

function formatDuration(dur) {
    if (!dur || dur === '?:??') return dur || '0:00';
    if (typeof dur === 'string' && dur.includes(':')) return dur;
    const s = parseInt(dur) || 0;
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlaylistPage() {
    const { id } = useParams();
    const { token, guildId } = useAuth();
    const { play } = usePlayer();
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !guildId || !id) return;
        fetch(`${API_BASE}/api/guild/${guildId}/playlists/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(setPlaylist)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token, guildId, id]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} /></Box>;
    if (!playlist) return <Typography color="text.secondary" sx={{ py: 4 }}>Playlist nicht gefunden</Typography>;

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, mt: 1 }}>
                <Box sx={{
                    width: 80, height: 80, borderRadius: 2,
                    bgcolor: 'rgba(8,252,254,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <QueueMusicIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.5 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{playlist.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {playlist.tracks?.length || 0} Songs
                    </Typography>
                </Box>
            </Stack>

            <Stack spacing={0.25}>
                {(playlist.tracks || []).map((track, i) => (
                    <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                        p: 1, borderRadius: 1.5, cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                        transition: 'background 0.15s',
                    }}
                        onClick={() => play(track.url || track.title)}
                    >
                        <Typography variant="body2" color="text.disabled" sx={{ width: 24, textAlign: 'right', fontSize: '0.8rem' }}>
                            {i + 1}
                        </Typography>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: 1,
                            bgcolor: '#252532', flexShrink: 0, overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {track.thumbnail ? (
                                <Box component="img" src={track.thumbnail} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <MusicNoteIcon sx={{ fontSize: 18, opacity: 0.2 }} />
                            )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{
                                fontWeight: 500, fontSize: '0.85rem',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {track.title}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                {track.artist || 'Unbekannt'}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="text.disabled">
                            {formatDuration(track.duration)}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}

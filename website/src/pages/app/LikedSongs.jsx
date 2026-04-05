import { useState, useEffect } from 'react';
import { Box, Typography, Stack, IconButton, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

export default function LikedSongs() {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token, guildId } = useAuth();
    const { play } = usePlayer();

    useEffect(() => {
        if (!token || !guildId) return;
        fetch(`${API_BASE}/api/guild/${guildId}/likes`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : [])
            .then(setTracks)
            .finally(() => setLoading(false));
    }, [token, guildId]);

    const handleUnlike = async (trackUrl, index) => {
        await fetch(`${API_BASE}/api/guild/${guildId}/likes/${encodeURIComponent(trackUrl)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        setTracks(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, mt: 1 }}>
                <Box sx={{
                    width: 56, height: 56, borderRadius: 2,
                    background: 'linear-gradient(135deg, #f0a0ee, #b48afe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <FavoriteIcon sx={{ fontSize: 28, color: 'white' }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Gelikte Songs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {tracks.length} {tracks.length === 1 ? 'Song' : 'Songs'}
                    </Typography>
                </Box>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                </Box>
            ) : tracks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <FavoriteIcon sx={{ fontSize: 56, opacity: 0.08, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Noch keine Likes
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        Druecke das Herz im Player, um Songs zu speichern.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={0.25}>
                    {tracks.map((track, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                            p: 1, borderRadius: 1.5, cursor: 'pointer',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.04)',
                                '& .actions': { opacity: 1 },
                            },
                            transition: 'background 0.15s',
                        }}
                            onClick={() => play(track.track_url)}
                        >
                            <Typography variant="body2" sx={{
                                color: 'text.disabled', fontFamily: 'monospace',
                                minWidth: 28, textAlign: 'right', fontSize: '0.85rem',
                            }}>
                                {i + 1}
                            </Typography>
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
                            <IconButton className="actions" size="small"
                                onClick={(e) => { e.stopPropagation(); handleUnlike(track.track_url, i); }}
                                sx={{ opacity: 0, color: 'text.disabled', transition: 'opacity 0.15s' }}
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Box>
    );
}

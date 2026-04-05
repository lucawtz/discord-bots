import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Stack, Button, CircularProgress, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AlbumIcon from '@mui/icons-material/Album';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

function formatDuration(sec) {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AlbumPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { play } = usePlayer();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !token) return;
        setLoading(true);
        fetch(`${API_BASE}/api/album/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setAlbum)
            .catch(() => setAlbum(null))
            .finally(() => setLoading(false));
    }, [id, token]);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
    );

    if (!album) return (
        <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography variant="h6" color="text.secondary">Album nicht gefunden</Typography>
        </Box>
    );

    const totalDuration = album.tracks?.reduce((sum, t) => sum + (t.duration || 0), 0) || 0;
    const artistName = album.artist?.map(a => a.name).join(', ') || '';

    const playAll = () => {
        if (album.tracks?.[0]) play(album.tracks[0].searchQuery);
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4, mt: 1 }}>
                <Box sx={{
                    width: { xs: 200, sm: 220 }, height: { xs: 200, sm: 220 },
                    borderRadius: 2, bgcolor: '#252532', flexShrink: 0,
                    overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: { xs: 'auto', sm: 0 },
                }}>
                    {album.image ? (
                        <Box component="img" src={album.image} alt={album.name}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : <AlbumIcon sx={{ fontSize: 60, opacity: 0.12 }} />}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: 0 }}>
                    <Typography variant="caption" sx={{
                        textTransform: 'uppercase', letterSpacing: 2,
                        color: 'text.disabled', fontWeight: 600, fontSize: '0.7rem',
                    }}>
                        Album
                    </Typography>
                    <Typography variant="h4" sx={{
                        fontWeight: 900, fontSize: { xs: '1.5rem', md: '2.2rem' },
                        lineHeight: 1.1, mb: 1,
                    }}>
                        {album.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        {album.artist?.map(a => (
                            <Typography key={a.id} variant="body2" sx={{
                                fontWeight: 600, cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                            }}
                                onClick={() => navigate(`/app/artist/${a.id}`)}
                            >
                                {a.name}
                            </Typography>
                        ))}
                        {album.releaseDate && (
                            <Typography variant="body2" color="text.disabled">
                                · {album.releaseDate.slice(0, 4)}
                            </Typography>
                        )}
                        <Typography variant="body2" color="text.disabled">
                            · {album.totalTracks} Songs, {formatDuration(totalDuration)}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                        <Button
                            variant="contained" startIcon={<PlayArrowIcon />}
                            onClick={playAll}
                            sx={{
                                background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                                color: '#0a0a0f', fontWeight: 600, borderRadius: 50, px: 3,
                            }}
                        >
                            Abspielen
                        </Button>
                    </Stack>
                </Box>
            </Stack>

            {/* Track List */}
            <Box sx={{
                borderTop: '1px solid', borderColor: 'divider', pt: 1,
            }}>
                {/* Header row */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                    px: 1, py: 1, color: 'text.disabled',
                }}>
                    <Typography variant="caption" sx={{ minWidth: 28, textAlign: 'right', fontFamily: 'monospace' }}>
                        #
                    </Typography>
                    <Typography variant="caption" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
                        Titel
                    </Typography>
                    <AccessTimeIcon sx={{ fontSize: 14 }} />
                </Stack>

                <Stack spacing={0}>
                    {album.tracks?.map((track, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                            p: 1, borderRadius: 1.5, cursor: 'pointer',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.04)',
                                '& .track-play': { opacity: 1 },
                                '& .track-num': { opacity: 0 },
                            },
                            transition: 'background 0.15s',
                        }}
                            onClick={() => play(track.searchQuery)}
                        >
                            <Box sx={{ minWidth: 28, textAlign: 'right', position: 'relative' }}>
                                <Typography className="track-num" variant="body2" sx={{
                                    color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.85rem',
                                    transition: 'opacity 0.15s',
                                }}>
                                    {track.trackNumber}
                                </Typography>
                                <PlayArrowIcon className="track-play" sx={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: 18, color: 'text.primary', opacity: 0,
                                    transition: 'opacity 0.15s',
                                }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{
                                    fontWeight: 600, fontSize: '0.88rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {track.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {track.artist}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                                {formatDuration(track.duration)}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}

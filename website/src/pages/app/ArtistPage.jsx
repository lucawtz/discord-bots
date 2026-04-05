import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Button, Chip, Avatar, CircularProgress,
    IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PersonIcon from '@mui/icons-material/Person';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

function formatDuration(sec) {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFollowers(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
    return `${n}`;
}

export default function ArtistPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { play } = usePlayer();
    const [artist, setArtist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAllTracks, setShowAllTracks] = useState(false);

    useEffect(() => {
        if (!id || !token) return;
        setLoading(true);
        fetch(`${API_BASE}/api/artist/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setArtist)
            .catch(() => setArtist(null))
            .finally(() => setLoading(false));
    }, [id, token]);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
    );

    if (!artist) return (
        <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography variant="h6" color="text.secondary">Artist nicht gefunden</Typography>
        </Box>
    );

    const visibleTracks = showAllTracks ? artist.topTracks : artist.topTracks?.slice(0, 5);

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            {/* Hero Banner */}
            <Box sx={{
                position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 4,
                background: `linear-gradient(180deg, rgba(8,252,254,0.15) 0%, rgba(10,10,15,0.95) 100%)`,
                p: { xs: 3, md: 5 }, pt: { xs: 6, md: 8 },
            }}>
                {artist.image && (
                    <Box sx={{
                        position: 'absolute', inset: 0, opacity: 0.15,
                        backgroundImage: `url(${artist.image})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: 'blur(40px)',
                    }} />
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} spacing={3}
                    sx={{ position: 'relative', zIndex: 1 }}
                >
                    <Avatar src={artist.image} sx={{
                        width: { xs: 140, md: 180 }, height: { xs: 140, md: 180 },
                        bgcolor: '#252532', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <PersonIcon sx={{ fontSize: 60 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{
                            textTransform: 'uppercase', letterSpacing: 2,
                            color: 'text.disabled', fontWeight: 600, fontSize: '0.7rem',
                        }}>
                            Artist
                        </Typography>
                        <Typography variant="h3" sx={{
                            fontWeight: 900, fontSize: { xs: '2rem', md: '2.8rem' },
                            lineHeight: 1.1, mb: 1,
                        }}>
                            {artist.name}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" color="text.secondary">
                                {formatFollowers(artist.followers)} Follower
                            </Typography>
                            {artist.genres?.slice(0, 3).map(g => (
                                <Chip key={g} label={g} size="small" sx={{
                                    bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary',
                                    fontSize: '0.72rem', height: 24,
                                }} />
                            ))}
                        </Stack>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ mt: 3, position: 'relative', zIndex: 1 }}>
                    <Button
                        variant="contained" startIcon={<PlayArrowIcon />}
                        onClick={() => artist.topTracks?.[0] && play(artist.topTracks[0].searchQuery)}
                        sx={{
                            background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', fontWeight: 600, borderRadius: 50, px: 3,
                        }}
                    >
                        Abspielen
                    </Button>
                </Stack>
            </Box>

            {/* Top Tracks */}
            {artist.topTracks?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
                        Beliebte Songs
                    </Typography>
                    <Stack spacing={0.25}>
                        {visibleTracks.map((track, i) => (
                            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{
                                p: 1, borderRadius: 1.5, cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                transition: 'background 0.15s',
                            }}
                                onClick={() => play(track.searchQuery)}
                            >
                                <Typography variant="body2" sx={{
                                    color: 'text.disabled', fontFamily: 'monospace',
                                    minWidth: 24, textAlign: 'right',
                                }}>
                                    {i + 1}
                                </Typography>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: 1,
                                    bgcolor: '#252532', flexShrink: 0, overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {track.thumbnail ? (
                                        <Box component="img" src={track.thumbnail} alt=""
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : <MusicNoteIcon sx={{ fontSize: 20, opacity: 0.2 }} />}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{
                                        fontWeight: 600, fontSize: '0.88rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {track.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {track.albumName}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                                    {formatDuration(track.duration)}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                    {artist.topTracks.length > 5 && (
                        <Button size="small" onClick={() => setShowAllTracks(!showAllTracks)}
                            sx={{ color: 'text.secondary', mt: 1, textTransform: 'none' }}>
                            {showAllTracks ? 'Weniger anzeigen' : 'Alle anzeigen'}
                        </Button>
                    )}
                </Box>
            )}

            {/* Albums */}
            {artist.albums?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
                        Alben
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{
                        overflowX: 'auto', pb: 1,
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                        {artist.albums.map(a => (
                            <Box key={a.id} onClick={() => navigate(`/app/album/${a.id}`)} sx={{
                                minWidth: 155, maxWidth: 170, flexShrink: 0, cursor: 'pointer',
                                '&:hover .album-img': { transform: 'scale(1.03)' },
                            }}>
                                <Box className="album-img" sx={{
                                    width: '100%', aspectRatio: '1', borderRadius: 1.5,
                                    bgcolor: '#252532', overflow: 'hidden', transition: 'transform 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {a.image ? (
                                        <Box component="img" src={a.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : <AlbumIcon sx={{ fontSize: 40, opacity: 0.12 }} />}
                                </Box>
                                <Typography variant="body2" sx={{
                                    fontWeight: 600, mt: 1, fontSize: '0.82rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {a.name}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {a.releaseDate?.slice(0, 4)}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Singles */}
            {artist.singles?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
                        Singles & EPs
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{
                        overflowX: 'auto', pb: 1,
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                        {artist.singles.slice(0, 10).map(a => (
                            <Box key={a.id} onClick={() => navigate(`/app/album/${a.id}`)} sx={{
                                minWidth: 130, maxWidth: 145, flexShrink: 0, cursor: 'pointer',
                                '&:hover .single-img': { transform: 'scale(1.03)' },
                            }}>
                                <Box className="single-img" sx={{
                                    width: '100%', aspectRatio: '1', borderRadius: 1.5,
                                    bgcolor: '#252532', overflow: 'hidden', transition: 'transform 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {a.image ? (
                                        <Box component="img" src={a.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : <MusicNoteIcon sx={{ fontSize: 30, opacity: 0.12 }} />}
                                </Box>
                                <Typography variant="body2" sx={{
                                    fontWeight: 500, mt: 0.75, fontSize: '0.78rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {a.name}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Related Artists */}
            {artist.related?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
                        Aehnliche Artists
                    </Typography>
                    <Stack direction="row" spacing={2.5} sx={{
                        overflowX: 'auto', pb: 1,
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                        {artist.related.map(a => (
                            <Box key={a.id} onClick={() => navigate(`/app/artist/${a.id}`)} sx={{
                                textAlign: 'center', cursor: 'pointer', minWidth: 100,
                                '&:hover .related-avatar': { transform: 'scale(1.05)' },
                            }}>
                                <Avatar className="related-avatar" src={a.image} sx={{
                                    width: 90, height: 90, mx: 'auto', mb: 1,
                                    transition: 'transform 0.2s', bgcolor: '#252532',
                                }}>
                                    <PersonIcon sx={{ fontSize: 32 }} />
                                </Avatar>
                                <Typography variant="body2" sx={{
                                    fontWeight: 500, fontSize: '0.82rem',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    maxWidth: 100,
                                }}>
                                    {a.name}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
}

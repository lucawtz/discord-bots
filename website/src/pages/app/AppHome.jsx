import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Card, CardContent, Chip, IconButton,
    Skeleton, Avatar,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import PersonIcon from '@mui/icons-material/Person';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

const genres = [
    { name: 'Pop', color: '#e040fb', query: 'Pop Hits 2025' },
    { name: 'Hip-Hop', color: '#ff6d00', query: 'Hip Hop Rap' },
    { name: 'Rock', color: '#f44336', query: 'Rock Music' },
    { name: 'Electronic', color: '#08fcfe', query: 'Electronic EDM' },
    { name: 'R&B', color: '#ab47bc', query: 'R&B Soul' },
    { name: 'Jazz', color: '#ffa726', query: 'Jazz Music' },
    { name: 'Metal', color: '#78909c', query: 'Heavy Metal' },
    { name: 'Indie', color: '#66bb6a', query: 'Indie Alternative' },
    { name: 'K-Pop', color: '#ec407a', query: 'K-Pop Music' },
    { name: 'Latin', color: '#ef5350', query: 'Latin Reggaeton' },
];

function formatDuration(val) {
    if (typeof val === 'string' && val.includes(':')) return val;
    if (typeof val === 'number') {
        const m = Math.floor(val / 60);
        const s = Math.floor(val % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return '';
}

// ── Section Header ─────────────────────────────────────────────────
function SectionHeader({ icon, title, onShowAll }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                {icon}
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
                    {title}
                </Typography>
            </Stack>
            {onShowAll && (
                <Typography variant="body2" sx={{
                    color: 'text.secondary', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    '&:hover': { color: 'text.primary' },
                    transition: 'color 0.15s',
                }}
                    onClick={onShowAll}
                >
                    Alle anzeigen <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </Typography>
            )}
        </Stack>
    );
}

// ── Song Row ───────────────────────────────────────────────────────
function SongRow({ song, index, onPlay }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{
            p: 1, borderRadius: 1.5, cursor: 'pointer',
            '&:hover': {
                bgcolor: 'rgba(255,255,255,0.04)',
                '& .play-btn': { opacity: 1 },
            },
            transition: 'background 0.15s',
        }}
            onClick={() => onPlay(song.track_url || song.url || song.searchQuery || song.title)}
        >
            <Typography variant="body2" sx={{
                color: 'text.disabled', fontFamily: 'monospace',
                minWidth: 24, textAlign: 'right', fontSize: '0.85rem',
            }}>
                {index + 1}
            </Typography>
            <Box sx={{
                width: 44, height: 44, borderRadius: 1,
                bgcolor: '#252532', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
            }}>
                {song.thumbnail ? (
                    <Box component="img" src={song.thumbnail} alt=""
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <MusicNoteIcon sx={{ fontSize: 20, opacity: 0.2, color: 'primary.main' }} />
                )}
                <IconButton className="play-btn" size="small" sx={{
                    position: 'absolute', inset: 0, opacity: 0,
                    bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 1,
                    transition: 'opacity 0.15s',
                }}>
                    <PlayArrowIcon sx={{ fontSize: 20, color: 'white' }} />
                </IconButton>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{
                    fontWeight: 600, fontSize: '0.88rem',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {song.track_title || song.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {song.artist || 'Unbekannt'}
                </Typography>
            </Box>
            {song.play_count && (
                <Chip label={`${song.play_count}x`} size="small" sx={{
                    height: 20, fontSize: '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.04)', color: 'text.disabled',
                }} />
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                {formatDuration(song.durationSec || song.duration)}
            </Typography>
        </Stack>
    );
}

// ── Album Card ─────────────────────────────────────────────────────
function ReleaseCard({ album, onPlay }) {
    return (
        <Card
            onClick={() => onPlay(`${album.artist} ${album.name}`)}
            sx={{
                minWidth: 155, maxWidth: 170, flexShrink: 0, cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateY(-2px)' },
            }}
        >
            <Box sx={{
                width: '100%', aspectRatio: '1', bgcolor: '#252532',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
            }}>
                {album.image ? (
                    <Box component="img" src={album.image} alt={album.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <AlbumIcon sx={{ fontSize: 40, opacity: 0.12 }} />
                )}
            </Box>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" sx={{
                    fontWeight: 600, fontSize: '0.82rem',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {album.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{
                    display: 'block',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {album.artist}
                </Typography>
            </CardContent>
        </Card>
    );
}

// ── Skeleton Loaders ───────────────────────────────────────────────
function SongRowSkeleton() {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1 }}>
            <Skeleton variant="text" width={24} />
            <Skeleton variant="rounded" width={44} height={44} sx={{ bgcolor: '#252532' }} />
            <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" sx={{ bgcolor: '#252532' }} />
                <Skeleton variant="text" width="30%" sx={{ bgcolor: '#1a1a25' }} />
            </Box>
        </Stack>
    );
}

function CardSkeleton() {
    return (
        <Box sx={{ minWidth: 155, maxWidth: 170, flexShrink: 0 }}>
            <Skeleton variant="rounded" sx={{ aspectRatio: '1', bgcolor: '#252532', borderRadius: 1 }} />
            <Skeleton variant="text" width="80%" sx={{ mt: 1, bgcolor: '#252532' }} />
            <Skeleton variant="text" width="50%" sx={{ bgcolor: '#1a1a25' }} />
        </Box>
    );
}

// ── Main Component ─────────────────────────────────────────────────
export default function AppHome() {
    const { token, guildId } = useAuth();
    const { play } = usePlayer();
    const navigate = useNavigate();

    const [trending, setTrending] = useState(null);
    const [newReleases, setNewReleases] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [popular, setPopular] = useState(null);

    useEffect(() => {
        if (!token) return;

        // Fetch all sections in parallel
        const headers = { Authorization: `Bearer ${token}` };

        fetch(`${API_BASE}/api/discover/trending`, { headers })
            .then(r => r.ok ? r.json() : []).then(setTrending).catch(() => setTrending([]));

        fetch(`${API_BASE}/api/discover/new-releases`, { headers })
            .then(r => r.ok ? r.json() : []).then(setNewReleases).catch(() => setNewReleases([]));

        if (guildId) {
            fetch(`${API_BASE}/api/guild/${guildId}/discover/recommendations`, { headers })
                .then(r => r.ok ? r.json() : { forYou: [] }).then(setRecommendations).catch(() => setRecommendations({ forYou: [] }));

            fetch(`${API_BASE}/api/guild/${guildId}/discover/popular`, { headers })
                .then(r => r.ok ? r.json() : []).then(setPopular).catch(() => setPopular([]));
        }
    }, [token, guildId]);

    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Guten Morgen' : hours < 18 ? 'Guten Tag' : 'Guten Abend';

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Greeting */}
            <Typography variant="h4" sx={{
                fontWeight: 800, mb: 4, mt: 1,
                fontSize: { xs: '1.5rem', md: '2rem' },
            }}>
                {greeting}
            </Typography>

            {/* Genres */}
            <Box sx={{ mb: 5 }}>
                <SectionHeader
                    icon={<AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
                    title="Genres entdecken"
                />
                <Stack direction="row" spacing={1} sx={{
                    overflowX: 'auto', pb: 1,
                    scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                }}>
                    {genres.map((g) => (
                        <Chip
                            key={g.name}
                            label={g.name}
                            clickable
                            onClick={() => navigate(`/app/search?q=${encodeURIComponent(g.query)}`)}
                            sx={{
                                px: 1.5, py: 2.5, fontSize: '0.85rem', fontWeight: 600,
                                bgcolor: `${g.color}18`, color: g.color,
                                border: `1px solid ${g.color}30`, borderRadius: 2, flexShrink: 0,
                                '&:hover': { bgcolor: `${g.color}28` },
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {/* Popular on this server */}
            {popular && popular.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <SectionHeader
                        icon={<WhatshotIcon sx={{ color: '#ff6d00', fontSize: 22 }} />}
                        title="Beliebt auf diesem Server"
                    />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5 }}>
                        {popular.slice(0, 6).map((song, i) => (
                            <SongRow key={i} song={song} index={i} onPlay={play} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Recommendations */}
            {recommendations?.forYou?.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <SectionHeader
                        icon={<AutoAwesomeIcon sx={{ color: '#b48afe', fontSize: 22 }} />}
                        title={recommendations.becauseYouListened
                            ? `Weil du ${recommendations.becauseYouListened} gehoert hast`
                            : 'Fuer dich empfohlen'}
                    />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5 }}>
                        {recommendations.forYou.slice(0, 6).map((song, i) => (
                            <SongRow key={i} song={song} index={i} onPlay={(q) => play(song.searchQuery || q)} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Trending */}
            <Box sx={{ mb: 5 }}>
                <SectionHeader
                    icon={<TrendingUpIcon sx={{ color: '#f44336', fontSize: 22 }} />}
                    title="Trending"
                />
                {trending === null ? (
                    <Stack spacing={0.5}>
                        {[...Array(4)].map((_, i) => <SongRowSkeleton key={i} />)}
                    </Stack>
                ) : trending.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 3 }}>
                        Trending-Daten nicht verfuegbar
                    </Typography>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5 }}>
                        {trending.slice(0, 8).map((song, i) => (
                            <SongRow key={i} song={song} index={i} onPlay={play} />
                        ))}
                    </Box>
                )}
            </Box>

            {/* New Releases */}
            <Box sx={{ mb: 5 }}>
                <SectionHeader
                    icon={<NewReleasesIcon sx={{ color: '#66bb6a', fontSize: 22 }} />}
                    title="Neue Releases"
                />
                {newReleases === null ? (
                    <Stack direction="row" spacing={2} sx={{ overflowX: 'hidden' }}>
                        {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
                    </Stack>
                ) : newReleases.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 3 }}>
                        Keine neuen Releases verfuegbar
                    </Typography>
                ) : (
                    <Stack direction="row" spacing={2} sx={{
                        overflowX: 'auto', pb: 1,
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                        {newReleases.map((album) => (
                            <ReleaseCard key={album.id} album={album} onPlay={play} />
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

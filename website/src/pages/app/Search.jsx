import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, CircularProgress, Chip, Avatar,
    IconButton, Card, CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { API_BASE } from '../../config';

const categories = [
    { label: 'Alle', value: 'all' },
    { label: 'Songs', value: 'tracks' },
    { label: 'Artists', value: 'artists' },
    { label: 'Alben', value: 'albums' },
];

const browseGenres = [
    { name: 'Pop', color: '#e040fb' },
    { name: 'Hip-Hop', color: '#ff6d00' },
    { name: 'Rock', color: '#f44336' },
    { name: 'Electronic', color: '#08fcfe' },
    { name: 'R&B', color: '#ab47bc' },
    { name: 'Jazz', color: '#ffa726' },
    { name: 'Classical', color: '#8d6e63' },
    { name: 'Metal', color: '#78909c' },
    { name: 'Indie', color: '#66bb6a' },
    { name: 'Latin', color: '#ef5350' },
    { name: 'K-Pop', color: '#ec407a' },
    { name: 'Schlager', color: '#ffd54f' },
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

function formatFollowers(n) {
    if (!n) return '';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

// ── Track Row ──────────────────────────────────────────────────────
function TrackRow({ track, index, onPlay }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{
            p: 1, borderRadius: 1.5, cursor: 'pointer',
            '&:hover': {
                bgcolor: 'rgba(255,255,255,0.04)',
                '& .play-overlay': { opacity: 1 },
                '& .track-num': { opacity: 0 },
            },
            transition: 'background 0.15s',
        }}
            onClick={() => onPlay(track.url || track.title)}
        >
            <Box sx={{ position: 'relative', minWidth: 24, textAlign: 'right' }}>
                <Typography className="track-num" variant="body2" sx={{
                    color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.85rem',
                    transition: 'opacity 0.15s',
                }}>
                    {index + 1}
                </Typography>
                <PlayArrowIcon className="play-overlay" sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 18, color: 'text.primary', opacity: 0,
                    transition: 'opacity 0.15s',
                }} />
            </Box>
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
                    {track.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {track.artist || 'Unbekannt'}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{
                color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0,
            }}>
                {formatDuration(track.durationSec || track.duration)}
            </Typography>
        </Stack>
    );
}

// ── Artist Card ────────────────────────────────────────────────────
function ArtistCard({ artist }) {
    return (
        <Box sx={{
            textAlign: 'center', cursor: 'pointer', p: 2,
            borderRadius: 2, transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
            '&:hover .artist-avatar': { transform: 'scale(1.05)' },
            minWidth: 140, maxWidth: 160,
        }}>
            <Avatar
                className="artist-avatar"
                src={artist.image}
                sx={{
                    width: 100, height: 100, mx: 'auto', mb: 1.5,
                    transition: 'transform 0.2s',
                    bgcolor: '#252532',
                }}
            >
                <PersonIcon sx={{ fontSize: 40, opacity: 0.3 }} />
            </Avatar>
            <Typography variant="body2" sx={{
                fontWeight: 600, fontSize: '0.88rem',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {artist.name}
            </Typography>
            {artist.followers > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                    {formatFollowers(artist.followers)} Follower
                </Typography>
            )}
            {artist.genres?.length > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{
                    display: 'block', fontSize: '0.7rem', mt: 0.25,
                }}>
                    {artist.genres.join(', ')}
                </Typography>
            )}
        </Box>
    );
}

// ── Album Card ─────────────────────────────────────────────────────
function AlbumCard({ album }) {
    return (
        <Card sx={{
            minWidth: 155, maxWidth: 170, flexShrink: 0, cursor: 'pointer',
            bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: 'divider',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateY(-2px)' },
        }}>
            <Box sx={{
                width: '100%', aspectRatio: '1', bgcolor: '#252532',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
            }}>
                {album.image ? (
                    <Box component="img" src={album.image} alt=""
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
                {album.releaseDate && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                        {album.releaseDate.slice(0, 4)} · {album.totalTracks} Songs
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

// ── Section Header ─────────────────────────────────────────────────
function SectionHeader({ title, count, onShowAll }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {title}
                </Typography>
                {count > 0 && (
                    <Chip label={count} size="small" sx={{
                        height: 20, fontSize: '0.7rem',
                        bgcolor: 'rgba(255,255,255,0.06)', color: 'text.disabled',
                    }} />
                )}
            </Stack>
            {onShowAll && (
                <Typography variant="body2" sx={{
                    color: 'text.secondary', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    '&:hover': { color: 'text.primary' },
                    transition: 'color 0.15s', fontSize: '0.85rem',
                }}
                    onClick={onShowAll}
                >
                    Alle <ArrowForwardIcon sx={{ fontSize: 14 }} />
                </Typography>
            )}
        </Stack>
    );
}

// ── Main Search Component ──────────────────────────────────────────
export default function Search() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const { token } = useAuth();
    const { play } = usePlayer();

    useEffect(() => {
        if (!query || !token) {
            setResults(null);
            return;
        }
        setLoading(true);
        setActiveFilter('all');
        fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&enhanced=1`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                setResults({
                    tracks: data.tracks || [],
                    artists: data.artists || [],
                    albums: data.albums || [],
                });
            })
            .catch(() => setResults({ tracks: [], artists: [], albums: [] }))
            .finally(() => setLoading(false));
    }, [query, token]);

    // Browse state (no query)
    if (!query) {
        return (
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, mt: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    Suche
                </Typography>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontWeight: 600 }}>
                    Kategorien durchsuchen
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                }}>
                    {browseGenres.map((g) => (
                        <Box key={g.name}
                            onClick={() => navigate(`/app/search?q=${encodeURIComponent(g.name + ' Music')}`)}
                            sx={{
                                p: 3, borderRadius: 2, cursor: 'pointer',
                                bgcolor: `${g.color}12`, border: `1px solid ${g.color}20`,
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: `${g.color}22`, transform: 'translateY(-2px)' },
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: g.color }}>
                                {g.name}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }

    const totalResults = results
        ? results.tracks.length + results.artists.length + results.albums.length
        : 0;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, mt: 1 }}>
                Ergebnisse fuer "{query}"
            </Typography>
            {results && !loading && (
                <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
                    {totalResults} Ergebnisse
                </Typography>
            )}

            {/* Filter Tabs */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                {categories.map((cat) => (
                    <Chip
                        key={cat.value}
                        label={cat.label}
                        clickable
                        onClick={() => setActiveFilter(cat.value)}
                        sx={{
                            fontWeight: 600, fontSize: '0.82rem',
                            bgcolor: activeFilter === cat.value ? 'text.primary' : 'rgba(255,255,255,0.06)',
                            color: activeFilter === cat.value ? 'background.default' : 'text.secondary',
                            '&:hover': {
                                bgcolor: activeFilter === cat.value ? 'text.primary' : 'rgba(255,255,255,0.1)',
                            },
                        }}
                    />
                ))}
            </Stack>

            {/* Loading */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                </Box>
            )}

            {/* Results */}
            {!loading && results && (
                <Box>
                    {/* Top Result + Artists (side by side on desktop) */}
                    {(activeFilter === 'all' || activeFilter === 'artists') && results.artists.length > 0 && (
                        <Box sx={{ mb: 4 }}>
                            <SectionHeader
                                title="Artists"
                                count={results.artists.length}
                                onShowAll={activeFilter === 'all' ? () => setActiveFilter('artists') : undefined}
                            />
                            <Stack direction="row" spacing={1} sx={{
                                overflowX: 'auto', pb: 1,
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}>
                                {results.artists.slice(0, activeFilter === 'all' ? 6 : undefined).map((artist) => (
                                    <ArtistCard key={artist.id} artist={artist} />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Songs */}
                    {(activeFilter === 'all' || activeFilter === 'tracks') && results.tracks.length > 0 && (
                        <Box sx={{ mb: 4 }}>
                            <SectionHeader
                                title="Songs"
                                count={results.tracks.length}
                                onShowAll={activeFilter === 'all' && results.tracks.length > 6
                                    ? () => setActiveFilter('tracks')
                                    : undefined}
                            />
                            <Stack spacing={0.25}>
                                {results.tracks
                                    .slice(0, activeFilter === 'all' ? 6 : undefined)
                                    .map((track, i) => (
                                        <TrackRow key={i} track={track} index={i} onPlay={play} />
                                    ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Albums */}
                    {(activeFilter === 'all' || activeFilter === 'albums') && results.albums.length > 0 && (
                        <Box sx={{ mb: 4 }}>
                            <SectionHeader
                                title="Alben"
                                count={results.albums.length}
                                onShowAll={activeFilter === 'all' ? () => setActiveFilter('albums') : undefined}
                            />
                            <Stack direction="row" spacing={2} sx={{
                                overflowX: 'auto', pb: 1,
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}>
                                {results.albums.slice(0, activeFilter === 'all' ? 6 : undefined).map((album) => (
                                    <AlbumCard key={album.id} album={album} />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* No Results */}
                    {totalResults === 0 && (
                        <Box sx={{ textAlign: 'center', py: 10 }}>
                            <SearchIcon sx={{ fontSize: 56, opacity: 0.08, mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Keine Ergebnisse fuer "{query}"
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                Pruefe die Schreibweise oder versuche einen anderen Suchbegriff.
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

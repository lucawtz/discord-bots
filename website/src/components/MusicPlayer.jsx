import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Stack, Slider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Visualizer bars component
function VisualizerBars({ playing }) {
    return (
        <Stack
            direction="row" spacing="3px" alignItems="flex-end"
            justifyContent="center" sx={{ height: 50, position: 'absolute', bottom: 16, left: 16, right: 16 }}
        >
            {Array.from({ length: 20 }).map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 3, borderRadius: 1, bgcolor: 'primary.main', opacity: 0.5,
                        height: playing ? undefined : 4,
                        animation: playing ? `visualizerBar 1.2s ease-in-out ${i * 0.06}s infinite` : 'none',
                        '@keyframes visualizerBar': {
                            '0%, 100%': { height: 4 },
                            '50%': { height: `${15 + Math.random() * 35}px` },
                        },
                    }}
                />
            ))}
        </Stack>
    );
}

export default function MusicPlayer() {
    const [state, setState] = useState({
        connected: false,
        playing: false,
        currentSong: null,
        queue: [],
        position: 0,
        duration: 0,
        volume: 70,
        loopMode: 'off',
    });

    const wsRef = useRef(null);
    const intervalRef = useRef(null);

    // Demo mode - show a beautiful static player as preview
    const isDemoMode = true; // Set to false when connecting to real API

    const demoSong = {
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        thumbnail: null,
        duration: 200,
    };

    const demoQueue = [
        { title: 'Levitating', artist: 'Dua Lipa', duration: 203 },
        { title: 'Save Your Tears', artist: 'The Weeknd', duration: 215 },
        { title: 'Peaches', artist: 'Justin Bieber', duration: 198 },
    ];

    const displaySong = state.currentSong || (isDemoMode ? demoSong : null);
    const displayQueue = state.queue.length > 0 ? state.queue : (isDemoMode ? demoQueue : []);
    const displayPlaying = state.playing || (isDemoMode && true);
    const displayPosition = state.position || (isDemoMode ? 73 : 0);
    const displayDuration = state.duration || (isDemoMode ? demoSong.duration : 0);

    const loopIcons = {
        off: <RepeatIcon />,
        song: <RepeatOneIcon />,
        queue: <RepeatIcon />,
    };

    return (
        <Box sx={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
            border: '1px solid', borderColor: 'divider',
            borderRadius: 4, p: { xs: 2.5, sm: 3.5 },
            position: 'relative', overflow: 'hidden',
            '&::before': {
                content: '""', position: 'absolute', top: '-50%', left: '-50%',
                width: '200%', height: '200%',
                background: 'radial-gradient(circle at 30% 20%, rgba(8,252,254,0.04) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(240,160,238,0.03) 0%, transparent 50%)',
                pointerEvents: 'none',
            },
        }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
                <Typography variant="caption" sx={{
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'text.disabled',
                }}>
                    Now Playing
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                    <FiberManualRecordIcon sx={{
                        fontSize: 10,
                        color: isDemoMode ? 'success.main' : (state.connected ? 'success.main' : 'text.disabled'),
                        animation: (isDemoMode || state.connected) ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.4 },
                        },
                    }} />
                    <Typography variant="caption" sx={{ color: isDemoMode ? 'success.main' : (state.connected ? 'success.main' : 'text.disabled') }}>
                        {isDemoMode ? 'Preview' : (state.connected ? 'Live' : 'Offline')}
                    </Typography>
                </Stack>
            </Stack>

            {/* Artwork */}
            <Box sx={{
                width: '100%', aspectRatio: '1', borderRadius: 2,
                bgcolor: '#252532', mb: 3, overflow: 'hidden',
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {displaySong?.thumbnail ? (
                    <Box component="img" src={displaySong.thumbnail} alt={displaySong.title}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Box sx={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        background: 'linear-gradient(135deg, rgba(8,252,254,0.1) 0%, rgba(240,160,238,0.1) 100%)',
                        width: '100%', height: '100%', justifyContent: 'center',
                    }}>
                        <MusicNoteIcon sx={{ fontSize: 80, opacity: 0.2, color: 'primary.main' }} />
                    </Box>
                )}
                <VisualizerBars playing={displayPlaying} />
            </Box>

            {/* Song Info */}
            <Box sx={{ textAlign: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
                <Typography variant="h6" sx={{
                    fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {displaySong?.title || 'Kein Song'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {displaySong?.artist || 'Warte auf Wiedergabe...'}
                </Typography>
            </Box>

            {/* Progress */}
            <Box sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
                <Slider
                    value={displayPosition}
                    max={displayDuration || 100}
                    size="small"
                    sx={{
                        color: 'primary.main', height: 4, p: '0 !important',
                        '& .MuiSlider-thumb': {
                            width: 12, height: 12, opacity: 0,
                            transition: 'opacity 0.2s',
                            '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 8px rgba(8,252,254,0.4)' },
                        },
                        '&:hover .MuiSlider-thumb': { opacity: 1 },
                        '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: -0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {formatTime(displayPosition)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                        {formatTime(displayDuration)}
                    </Typography>
                </Stack>
            </Box>

            {/* Controls */}
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
                <IconButton size="small" sx={{
                    color: state.loopMode !== 'off' ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}>
                    <ShuffleIcon fontSize="small" />
                </IconButton>

                <IconButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <SkipPreviousIcon />
                </IconButton>

                <IconButton sx={{
                    bgcolor: 'text.primary', color: 'background.default',
                    width: 52, height: 52,
                    '&:hover': { bgcolor: 'text.primary', transform: 'scale(1.06)' },
                    transition: 'transform 0.2s',
                }}>
                    {displayPlaying ? <PauseIcon sx={{ fontSize: 28 }} /> : <PlayArrowIcon sx={{ fontSize: 28 }} />}
                </IconButton>

                <IconButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <SkipNextIcon />
                </IconButton>

                <IconButton size="small" sx={{
                    color: state.loopMode !== 'off' ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}>
                    {loopIcons[state.loopMode]}
                </IconButton>
            </Stack>

            {/* Volume */}
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 2, position: 'relative', zIndex: 1 }}>
                <VolumeDownIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Slider
                    value={state.volume}
                    onChange={(_, v) => setState(s => ({ ...s, volume: v }))}
                    size="small"
                    sx={{
                        width: 120, color: 'text.secondary', height: 3,
                        '& .MuiSlider-thumb': { width: 10, height: 10 },
                        '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                />
                <VolumeUpIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            </Stack>

            {/* Queue */}
            {displayQueue.length > 0 && (
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'text.disabled' }}>
                            <QueueMusicIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                            Warteschlange
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            {displayQueue.length} Songs
                        </Typography>
                    </Stack>
                    <Stack spacing={0.75} sx={{ maxHeight: 180, overflowY: 'auto' }}>
                        {displayQueue.map((song, i) => (
                            <Stack
                                key={i} direction="row" alignItems="center" spacing={1.5}
                                sx={{
                                    p: 1, borderRadius: 1,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    transition: 'background 0.2s',
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', minWidth: 20 }}>
                                    {i + 1}
                                </Typography>
                                <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: '#252532', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MusicNoteIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {song.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {song.artist || 'Unbekannt'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                                    {formatTime(song.duration)}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
}

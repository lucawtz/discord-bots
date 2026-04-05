import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Slider, Stack, Drawer } from '@mui/material';
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
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_WIDTH } from './Sidebar';
import { API_BASE } from '../../config';

export const PLAYER_HEIGHT = 80;

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function formatDurationString(val) {
    if (typeof val === 'number') return formatTime(val);
    if (typeof val === 'string' && val.includes(':')) return val;
    return '0:00';
}

function VolumeSliderIcon({ volume }) {
    if (volume === 0) return <VolumeOffIcon sx={{ fontSize: 18 }} />;
    if (volume < 30) return <VolumeMuteIcon sx={{ fontSize: 18 }} />;
    if (volume < 70) return <VolumeDownIcon sx={{ fontSize: 18 }} />;
    return <VolumeUpIcon sx={{ fontSize: 18 }} />;
}

export default function BottomPlayer() {
    const {
        connected, playing, paused, currentSong, queue, position, duration,
        volume, loopMode,
        pause: togglePause, skip, setVolume, seek, loop, shuffle,
        removeFromQueue,
    } = usePlayer();
    const { token, guildId } = useAuth();

    const [liked, setLiked] = useState(false);
    const [queueOpen, setQueueOpen] = useState(false);

    // Check if current song is liked
    useEffect(() => {
        if (!currentSong?.url || !token || !guildId) { setLiked(false); return; }
        fetch(`${API_BASE}/api/guild/${guildId}/likes/check?url=${encodeURIComponent(currentSong.url)}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : { liked: false })
            .then(d => setLiked(d.liked))
            .catch(() => setLiked(false));
    }, [currentSong?.url, token, guildId]);

    const toggleLike = useCallback(() => {
        if (!currentSong?.url || !token || !guildId) return;
        if (liked) {
            fetch(`${API_BASE}/api/guild/${guildId}/likes/${encodeURIComponent(currentSong.url)}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            setLiked(false);
        } else {
            fetch(`${API_BASE}/api/guild/${guildId}/likes`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: currentSong.title, url: currentSong.url,
                    artist: currentSong.artist, thumbnail: currentSong.thumbnail,
                    duration: currentSong.duration,
                }),
            });
            setLiked(true);
        }
    }, [liked, currentSong, token, guildId]);
    const [seeking, setSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);

    const isLive = connected && currentSong;
    const isPlaying = isLive ? (playing && !paused) : false;
    const displayPosition = seeking ? seekValue : (isLive ? position : 0);
    const displayDuration = isLive ? duration : 0;

    const loopIcons = {
        off: <RepeatIcon sx={{ fontSize: 18 }} />,
        song: <RepeatOneIcon sx={{ fontSize: 18 }} />,
        queue: <RepeatIcon sx={{ fontSize: 18 }} />,
    };

    return (
        <>
            <Box sx={{
                position: 'fixed',
                bottom: 0,
                left: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
                right: 0,
                height: PLAYER_HEIGHT,
                bgcolor: '#0e0e16',
                borderTop: '1px solid',
                borderColor: 'divider',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Progress Bar */}
                <Box sx={{ flexShrink: 0 }}>
                    <Slider
                        value={displayPosition}
                        max={displayDuration || 1}
                        onChange={(_, v) => { setSeeking(true); setSeekValue(v); }}
                        onChangeCommitted={(_, v) => { setSeeking(false); if (isLive) seek(v); }}
                        disabled={!isLive}
                        size="small"
                        sx={{
                            height: 3, p: '0 !important', borderRadius: 0,
                            color: isLive ? 'primary.main' : 'rgba(255,255,255,0.08)',
                            '& .MuiSlider-thumb': {
                                width: 0, height: 0,
                                transition: 'width 0.15s, height 0.15s',
                            },
                            '&:hover .MuiSlider-thumb': { width: 12, height: 12 },
                            '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.06)' },
                            '& .MuiSlider-track': { transition: 'none' },
                        }}
                    />
                </Box>

                {/* Player Content */}
                <Box sx={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    px: { xs: 1.5, sm: 2.5 }, gap: { xs: 1, sm: 2 },
                }}>
                    {/* Left - Song Info */}
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                        flex: 1, minWidth: 0, maxWidth: { xs: 'none', md: 300 },
                    }}>
                        <Box sx={{
                            width: 48, height: 48, borderRadius: 1.5,
                            bgcolor: '#252532', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', position: 'relative',
                        }}>
                            {currentSong?.thumbnail ? (
                                <Box component="img" src={currentSong.thumbnail} alt=""
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <MusicNoteIcon sx={{ fontSize: 22, opacity: 0.2, color: 'primary.main' }} />
                            )}
                            {/* Playing indicator dot */}
                            {isPlaying && (
                                <FiberManualRecordIcon sx={{
                                    position: 'absolute', bottom: 2, right: 2,
                                    fontSize: 8, color: 'primary.main',
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%,100%': { opacity: 1 },
                                        '50%': { opacity: 0.3 },
                                    },
                                }} />
                            )}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            {isLive ? (
                                <>
                                    <Typography variant="body2" sx={{
                                        fontWeight: 600, fontSize: '0.85rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {currentSong.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        color: 'text.secondary', display: 'block',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {currentSong.artist || 'Unbekannt'}
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.85rem' }}>
                                    {connected ? 'Warteschlange leer' : 'Nicht verbunden'}
                                </Typography>
                            )}
                        </Box>
                        {isLive && (
                            <IconButton
                                size="small"
                                onClick={toggleLike}
                                sx={{
                                    color: liked ? '#f0a0ee' : 'text.disabled',
                                    display: { xs: 'none', sm: 'flex' },
                                    '&:hover': { color: '#f0a0ee' },
                                }}
                            >
                                {liked ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                        )}
                    </Stack>

                    {/* Center - Controls */}
                    <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0 }}>
                        <IconButton
                            size="small"
                            onClick={() => isLive && shuffle()}
                            disabled={!isLive}
                            sx={{
                                color: 'text.disabled',
                                display: { xs: 'none', sm: 'flex' },
                                '&:hover': { color: 'text.primary' },
                                '&.Mui-disabled': { color: 'rgba(255,255,255,0.08)' },
                            }}
                        >
                            <ShuffleIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <IconButton
                            size="small"
                            disabled={!isLive}
                            onClick={() => isLive && seek(0)}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary' },
                                '&.Mui-disabled': { color: 'rgba(255,255,255,0.08)' },
                            }}
                        >
                            <SkipPreviousIcon sx={{ fontSize: 22 }} />
                        </IconButton>

                        <IconButton
                            onClick={() => isLive && togglePause()}
                            disabled={!connected}
                            sx={{
                                bgcolor: connected ? 'text.primary' : 'rgba(255,255,255,0.1)',
                                color: connected ? 'background.default' : 'text.disabled',
                                width: 40, height: 40,
                                '&:hover': { bgcolor: 'text.primary', transform: 'scale(1.05)' },
                                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.15)' },
                                transition: 'transform 0.15s',
                            }}
                        >
                            {isPlaying
                                ? <PauseIcon sx={{ fontSize: 22 }} />
                                : <PlayArrowIcon sx={{ fontSize: 22 }} />
                            }
                        </IconButton>

                        <IconButton
                            size="small"
                            onClick={() => isLive && skip()}
                            disabled={!isLive}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary' },
                                '&.Mui-disabled': { color: 'rgba(255,255,255,0.08)' },
                            }}
                        >
                            <SkipNextIcon sx={{ fontSize: 22 }} />
                        </IconButton>

                        <IconButton
                            size="small"
                            onClick={() => isLive && loop()}
                            disabled={!isLive}
                            sx={{
                                color: loopMode !== 'off' ? 'primary.main' : 'text.disabled',
                                display: { xs: 'none', sm: 'flex' },
                                '&:hover': { color: 'text.primary' },
                                '&.Mui-disabled': { color: 'rgba(255,255,255,0.08)' },
                            }}
                        >
                            {loopIcons[loopMode] || loopIcons.off}
                        </IconButton>
                    </Stack>

                    {/* Right - Time + Volume + Queue */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{
                        flex: 1, justifyContent: 'flex-end', minWidth: 0,
                        maxWidth: { xs: 'none', md: 300 },
                    }}>
                        {/* Time */}
                        {isLive && (
                            <Typography variant="caption" sx={{
                                color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.7rem',
                                display: { xs: 'none', md: 'block' }, flexShrink: 0,
                            }}>
                                {formatTime(displayPosition)} / {formatTime(displayDuration)}
                            </Typography>
                        )}

                        {/* Volume */}
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{
                            display: { xs: 'none', md: 'flex' },
                        }}>
                            <IconButton size="small" sx={{ color: 'text.disabled' }}>
                                <VolumeSliderIcon volume={volume} />
                            </IconButton>
                            <Slider
                                value={volume}
                                max={200}
                                onChange={(_, v) => connected && setVolume(v)}
                                disabled={!connected}
                                size="small"
                                sx={{
                                    width: 90, color: 'text.secondary', height: 3,
                                    '& .MuiSlider-thumb': { width: 10, height: 10 },
                                    '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.08)' },
                                }}
                            />
                        </Stack>

                        {/* Queue Toggle */}
                        <IconButton
                            size="small"
                            onClick={() => setQueueOpen(true)}
                            sx={{
                                color: queueOpen ? 'primary.main' : 'text.disabled',
                                '&:hover': { color: 'text.primary' },
                            }}
                        >
                            <QueueMusicIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Stack>
                </Box>
            </Box>

            {/* Queue Drawer */}
            <Drawer
                anchor="right"
                open={queueOpen}
                onClose={() => setQueueOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 380 }, bgcolor: '#0e0e16',
                        borderLeft: '1px solid', borderColor: 'divider',
                    },
                }}
            >
                <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            Warteschlange
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            {queue.length} {queue.length === 1 ? 'Song' : 'Songs'}
                        </Typography>
                    </Stack>

                    {/* Now Playing */}
                    {currentSong && (
                        <Box sx={{ mb: 2, flexShrink: 0 }}>
                            <Typography variant="caption" sx={{
                                fontWeight: 600, textTransform: 'uppercase',
                                letterSpacing: 1.5, color: 'primary.main', fontSize: '0.65rem',
                            }}>
                                Aktuell
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                                mt: 0.5, p: 1, borderRadius: 1.5,
                                bgcolor: 'rgba(8,252,254,0.04)',
                                border: '1px solid rgba(8,252,254,0.08)',
                            }}>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: 1,
                                    bgcolor: '#252532', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}>
                                    {currentSong.thumbnail ? (
                                        <Box component="img" src={currentSong.thumbnail} alt=""
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <MusicNoteIcon sx={{ fontSize: 20, opacity: 0.3 }} />
                                    )}
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" sx={{
                                        fontWeight: 600, fontSize: '0.82rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {currentSong.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {currentSong.artist || 'Unbekannt'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}>
                                    {formatDurationString(currentSong.duration)}
                                </Typography>
                            </Stack>
                        </Box>
                    )}

                    {/* Queue List */}
                    <Typography variant="caption" sx={{
                        fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: 1.5, color: 'text.disabled', fontSize: '0.65rem',
                        flexShrink: 0,
                    }}>
                        Als Naechstes
                    </Typography>
                    <Stack spacing={0.25} sx={{
                        mt: 0.5, flex: 1, overflowY: 'auto',
                        scrollbarWidth: 'thin', scrollbarColor: '#2a2a3a transparent',
                    }}>
                        {queue.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <QueueMusicIcon sx={{ fontSize: 40, opacity: 0.08, mb: 1 }} />
                                <Typography variant="body2" color="text.disabled">
                                    Die Warteschlange ist leer
                                </Typography>
                            </Box>
                        ) : queue.map((song, i) => (
                            <Stack
                                key={i} direction="row" alignItems="center" spacing={1.5}
                                sx={{
                                    p: 1, borderRadius: 1,
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.04)',
                                        '& .queue-remove': { opacity: 1 },
                                    },
                                    transition: 'background 0.15s',
                                }}
                            >
                                <Typography variant="caption" sx={{
                                    color: 'text.disabled', fontFamily: 'monospace',
                                    minWidth: 20, textAlign: 'right',
                                }}>
                                    {i + 1}
                                </Typography>
                                <Box sx={{
                                    width: 36, height: 36, borderRadius: 1,
                                    bgcolor: '#252532', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}>
                                    {song.thumbnail ? (
                                        <Box component="img" src={song.thumbnail} alt=""
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <MusicNoteIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                                    )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{
                                        fontSize: '0.82rem', fontWeight: 500,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {song.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        {song.artist || 'Unbekannt'}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}>
                                    {formatDurationString(song.duration)}
                                </Typography>
                                <IconButton
                                    className="queue-remove"
                                    size="small"
                                    onClick={() => removeFromQueue(i)}
                                    sx={{ opacity: 0, color: 'text.disabled', transition: 'opacity 0.15s' }}
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            </Drawer>
        </>
    );
}

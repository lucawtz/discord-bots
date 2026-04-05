import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Box, Typography, List, ListItemButton, ListItemIcon, ListItemText,
    Divider, IconButton, Stack,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import AddIcon from '@mui/icons-material/Add';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE } from '../../config';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

const mainNav = [
    { label: 'Home', icon: <HomeIcon />, path: '/app' },
    { label: 'Suche', icon: <SearchIcon />, path: '/app/search' },
];

const libraryNav = [
    { label: 'Bibliothek', icon: <LibraryMusicIcon />, path: '/app/library' },
    { label: 'Likes', icon: <FavoriteIcon />, path: '/app/library/likes' },
    { label: 'Verlauf', icon: <HistoryIcon />, path: '/app/library/history' },
];

export default function Sidebar() {
    const location = useLocation();
    const { token, guildId, voiceStatus } = useAuth();
    const [playlists, setPlaylists] = useState([]);

    // Fetch playlists from API
    useEffect(() => {
        if (!token || !guildId) return;
        fetch(`${API_BASE}/api/guild/${guildId}/playlists`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(setPlaylists)
            .catch(() => {});
    }, [token, guildId]);

    const isActive = (path) => {
        if (path === '/app') return location.pathname === '/app';
        return location.pathname.startsWith(path);
    };

    const navItemSx = (path) => ({
        borderRadius: 1.5, mb: 0.25, px: 1.5, py: 0.75,
        color: isActive(path) ? 'text.primary' : 'text.secondary',
        bgcolor: isActive(path) ? 'rgba(255,255,255,0.06)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'text.primary' },
        transition: 'all 0.15s ease',
    });

    return (
        <Box sx={{
            width: SIDEBAR_WIDTH, height: '100vh',
            position: 'fixed', top: 0, left: 0,
            display: 'flex', flexDirection: 'column',
            bgcolor: '#0e0e16', borderRight: '1px solid', borderColor: 'divider',
            zIndex: 1200, overflowY: 'auto', overflowX: 'hidden',
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        }}>
            {/* Logo */}
            <Box component={Link} to="/" sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2.5, py: 2.5, textDecoration: 'none',
            }}>
                <Box component="img" src="/logo.png" alt="BeatByte"
                    sx={{ width: 28, height: 28, objectFit: 'contain' }}
                />
                <Typography variant="h6" sx={{
                    fontWeight: 700, fontSize: '1.05rem',
                    background: 'linear-gradient(135deg, #08fcfe, #f0a0ee)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    BeatByte
                </Typography>
            </Box>

            {/* Main Navigation */}
            <Box sx={{ px: 1.5 }}>
                <List disablePadding>
                    {mainNav.map((item) => (
                        <ListItemButton key={item.path} component={Link} to={item.path} sx={navItemSx(item.path)}>
                            <ListItemIcon sx={{ minWidth: 36, color: 'inherit', '& svg': { fontSize: 22 } }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label}
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive(item.path) ? 600 : 500 }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            <Divider sx={{ mx: 2.5, my: 1.5 }} />

            {/* Library */}
            <Box sx={{ px: 1.5 }}>
                <List disablePadding>
                    {libraryNav.map((item) => (
                        <ListItemButton key={item.path} component={Link} to={item.path} sx={navItemSx(item.path)}>
                            <ListItemIcon sx={{ minWidth: 36, color: 'inherit', '& svg': { fontSize: 22 } }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label}
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive(item.path) ? 600 : 500 }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            <Divider sx={{ mx: 2.5, my: 1.5 }} />

            {/* Playlists */}
            <Box sx={{ px: 1.5, flex: 1, minHeight: 0 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, mb: 0.5 }}>
                    <Typography variant="caption" sx={{
                        fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: 1.5, color: 'text.disabled', fontSize: '0.7rem',
                    }}>
                        Playlists
                    </Typography>
                    <IconButton size="small" sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                        <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>
                <List disablePadding>
                    {playlists.length === 0 ? (
                        <Typography variant="caption" color="text.disabled" sx={{ px: 1.5, display: 'block' }}>
                            Keine Playlists
                        </Typography>
                    ) : playlists.map((pl) => (
                        <ListItemButton key={pl.id} component={Link} to={`/app/playlist/${pl.id}`} sx={{ ...navItemSx(`/app/playlist/${pl.id}`), py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32, color: 'text.disabled' }}>
                                <QueueMusicIcon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText primary={pl.name}
                                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 400, noWrap: true }}
                            />
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {pl.track_count}
                            </Typography>
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            {/* Voice Channel Status */}
            {voiceStatus?.botConnected && (
                <Box sx={{
                    mx: 1.5, mb: 1, p: 1.5, borderRadius: 1.5,
                    bgcolor: 'rgba(102,187,106,0.06)',
                    border: '1px solid rgba(102,187,106,0.1)',
                    flexShrink: 0,
                }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 8, color: '#66bb6a' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#66bb6a', fontSize: '0.72rem' }}>
                            Verbunden
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        <VolumeUpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{
                            fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            #{voiceStatus.channelName}
                        </Typography>
                        {voiceStatus.members?.length > 0 && (
                            <Stack direction="row" alignItems="center" spacing={0.25} sx={{ ml: 'auto', flexShrink: 0 }}>
                                <PeopleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    {voiceStatus.members.length}
                                </Typography>
                            </Stack>
                        )}
                    </Stack>
                    {voiceStatus.currentSong && (
                        <Typography variant="caption" sx={{
                            color: 'text.disabled', fontSize: '0.68rem', mt: 0.5, display: 'block',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {voiceStatus.currentSong.title}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Bottom spacer for player */}
            <Box sx={{ height: 90, flexShrink: 0 }} />
        </Box>
    );
}

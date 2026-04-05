import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, InputBase, IconButton, Avatar, Typography, Menu, MenuItem,
    Divider, Stack, Chip, Dialog, DialogTitle, DialogContent,
    TextField, Button, DialogActions, List, ListItemButton, ListItemText,
    ListItemAvatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import HeadsetIcon from '@mui/icons-material/Headset';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../contexts/AuthContext';

export const TOPBAR_HEIGHT = 64;

export default function TopBar() {
    const {
        user, isGuest, isAuthenticated, voiceStatus, guild,
        oauthPending, selectOAuthGuild,
        loginWithCode, loginWithDiscord, logout,
    } = useAuth();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [loginOpen, setLoginOpen] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q) navigate(`/app/search?q=${encodeURIComponent(q)}`);
    };

    const handleCodeLogin = async () => {
        setLoginError('');
        setLoginLoading(true);
        try {
            await loginWithCode(accessCode.trim());
            setLoginOpen(false);
            setAccessCode('');
        } catch (err) {
            setLoginError(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    const avatarUrl = user?.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : null;

    const isInVoice = voiceStatus?.botConnected;

    return (
        <>
            <Box sx={{
                height: TOPBAR_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                gap: 2,
                position: 'sticky',
                top: 0,
                bgcolor: 'rgba(10,10,15,0.85)',
                backdropFilter: 'blur(20px)',
                zIndex: 1100,
                borderBottom: '1px solid',
                borderColor: 'rgba(255,255,255,0.04)',
            }}>
                {/* Navigation Arrows */}
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <IconButton
                        size="small"
                        onClick={() => navigate(-1)}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary',
                            width: 32, height: 32,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                    >
                        <ArrowBackIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => navigate(1)}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary',
                            width: 32, height: 32,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                    >
                        <ArrowForwardIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>

                {/* Search Bar */}
                <Box
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                        flex: 1, maxWidth: 480,
                        display: 'flex', alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 50,
                        px: 2, height: 40,
                        border: '1px solid transparent',
                        transition: 'all 0.2s ease',
                        '&:focus-within': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.12)',
                        },
                    }}
                >
                    <SearchIcon sx={{ fontSize: 20, color: 'text.disabled', mr: 1 }} />
                    <InputBase
                        placeholder="Songs, Artists oder Alben suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            flex: 1, fontSize: '0.875rem', color: 'text.primary',
                            '& input::placeholder': { color: 'text.disabled', opacity: 1 },
                        }}
                    />
                </Box>

                {/* Profile Area */}
                {isAuthenticated ? (
                    <Box
                        onClick={(e) => setMenuAnchor(e.currentTarget)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            cursor: 'pointer', flexShrink: 0,
                            px: 1, py: 0.5, borderRadius: 50,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                            transition: 'background 0.15s',
                        }}
                    >
                        {/* Avatar with voice status dot */}
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={avatarUrl}
                                sx={{
                                    width: 32, height: 32, bgcolor: '#252532',
                                    fontSize: '0.85rem', fontWeight: 600,
                                }}
                            >
                                {isGuest ? <PersonIcon sx={{ fontSize: 18 }} /> : user?.username?.[0]?.toUpperCase()}
                            </Avatar>
                            {isInVoice && (
                                <FiberManualRecordIcon sx={{
                                    position: 'absolute', bottom: -2, right: -2,
                                    fontSize: 12, color: '#66bb6a',
                                    bgcolor: '#0e0e16', borderRadius: '50%',
                                }} />
                            )}
                        </Box>
                        <Typography variant="body2" sx={{
                            fontWeight: 500, color: 'text.primary',
                            display: { xs: 'none', sm: 'block' },
                            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {isGuest ? 'Guest' : user?.username}
                        </Typography>
                    </Box>
                ) : (
                    <Button
                        variant="contained" size="small"
                        startIcon={<LoginIcon />}
                        onClick={() => setLoginOpen(true)}
                        sx={{
                            background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', fontWeight: 600, px: 2,
                            borderRadius: 50, textTransform: 'none', flexShrink: 0,
                            '&:hover': { boxShadow: '0 0 16px rgba(8,252,254,0.2)' },
                        }}
                    >
                        Login
                    </Button>
                )}

                {/* Profile Dropdown */}
                <Menu
                    anchorEl={menuAnchor}
                    open={!!menuAnchor}
                    onClose={() => setMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1, bgcolor: '#16161f', border: '1px solid',
                                borderColor: 'divider', borderRadius: 2, minWidth: 260,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            },
                        },
                    }}
                >
                    {/* User Info Header */}
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar src={avatarUrl} sx={{ width: 44, height: 44, bgcolor: '#252532' }}>
                                    {isGuest ? <PersonIcon /> : user?.username?.[0]?.toUpperCase()}
                                </Avatar>
                                {isInVoice && (
                                    <FiberManualRecordIcon sx={{
                                        position: 'absolute', bottom: -1, right: -1,
                                        fontSize: 14, color: '#66bb6a',
                                        bgcolor: '#16161f', borderRadius: '50%',
                                    }} />
                                )}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {isGuest ? 'Guest' : user?.username}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {isGuest ? 'Code-Login' : 'Discord'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Voice Channel Status */}
                    {isInVoice && (
                        <Box sx={{
                            mx: 1.5, mb: 1, p: 1.5, borderRadius: 1.5,
                            bgcolor: 'rgba(102,187,106,0.06)',
                            border: '1px solid rgba(102,187,106,0.12)',
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <VolumeUpIcon sx={{ fontSize: 14, color: '#66bb6a' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#66bb6a' }}>
                                    #{voiceStatus.channelName}
                                </Typography>
                                {voiceStatus.members?.length > 0 && (
                                    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ ml: 'auto' }}>
                                        <PeopleIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                            {voiceStatus.members.length}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                            {voiceStatus.currentSong && (
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                    <MusicNoteIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                    <Typography variant="caption" sx={{
                                        color: 'text.secondary', fontSize: '0.7rem',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {voiceStatus.currentSong.title}
                                        {voiceStatus.currentSong.artist && ` - ${voiceStatus.currentSong.artist}`}
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    )}

                    {/* Server Info */}
                    {guild && (
                        <Box sx={{ px: 2, py: 0.75 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                Server: {guild.name}
                            </Typography>
                        </Box>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                    <MenuItem onClick={() => { setMenuAnchor(null); logout(); }}
                        sx={{ py: 1, fontSize: '0.875rem', color: 'error.main' }}>
                        <LogoutIcon sx={{ fontSize: 18, mr: 1.5 }} />
                        Logout
                    </MenuItem>
                </Menu>
            </Box>

            {/* Login Dialog */}
            <Dialog
                open={loginOpen}
                onClose={() => { setLoginOpen(false); setLoginError(''); setAccessCode(''); }}
                maxWidth="xs" fullWidth
                PaperProps={{
                    sx: { bgcolor: '#16161f', border: '1px solid', borderColor: 'divider', borderRadius: 3 },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Anmelden</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Melde dich mit Discord an oder gib einen Zugangscode ein.
                    </Typography>

                    {/* Discord Login */}
                    <Button
                        fullWidth variant="contained"
                        onClick={() => { setLoginOpen(false); loginWithDiscord(); }}
                        startIcon={<HeadsetIcon />}
                        sx={{
                            bgcolor: '#5865F2', mb: 3, py: 1.25,
                            '&:hover': { bgcolor: '#4752C4' },
                            fontWeight: 600, textTransform: 'none',
                        }}
                    >
                        Mit Discord anmelden
                    </Button>

                    <Divider sx={{ mb: 3 }}>
                        <Chip label="oder" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'text.disabled' }} />
                    </Divider>

                    {/* Code Login */}
                    <TextField
                        fullWidth
                        label="Zugangscode"
                        placeholder="z.B. A1B2C3D4E5F6"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                        error={!!loginError}
                        helperText={loginError || 'Erstelle einen Code mit /app in Discord'}
                        slotProps={{ htmlInput: { maxLength: 12, style: { fontFamily: 'monospace', letterSpacing: 2 } } }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setLoginOpen(false)} sx={{ color: 'text.secondary' }}>
                        Abbrechen
                    </Button>
                    <Button
                        variant="contained" onClick={handleCodeLogin}
                        disabled={accessCode.trim().length < 6 || loginLoading}
                        sx={{
                            background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', fontWeight: 600,
                        }}
                    >
                        {loginLoading ? 'Pruefe...' : 'Anmelden'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Guild Selector Dialog (OAuth with multiple guilds) */}
            <Dialog
                open={!!oauthPending}
                maxWidth="xs" fullWidth
                PaperProps={{
                    sx: { bgcolor: '#16161f', border: '1px solid', borderColor: 'divider', borderRadius: 3 },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Server auswaehlen</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Waehle den Discord-Server, den du steuern moechtest.
                    </Typography>
                    <List disablePadding>
                        {oauthPending?.guilds.map((g) => (
                            <ListItemButton
                                key={g.id}
                                onClick={() => selectOAuthGuild(g.id)}
                                sx={{
                                    borderRadius: 1.5, mb: 0.5,
                                    border: '1px solid', borderColor: 'divider',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(8,252,254,0.04)' },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar src={g.icon} sx={{ bgcolor: '#252532' }}>
                                        {g.name[0]}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={g.name}
                                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
}

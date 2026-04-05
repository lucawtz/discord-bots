import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Button, IconButton, Box, Drawer,
    List, ListItem, ListItemButton, ListItemText, useScrollTrigger,
    Avatar, Menu, MenuItem, Stack, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLanguage } from '../i18n/LanguageContext';
import { DISCORD_LOGIN_URL } from '../config';

function DiscordIcon(props) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const location = useLocation();
    const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 30 });
    const { t, lang, setLang } = useLanguage();

    const navItems = [
        { label: t('nav.bots'), path: '/bots' },
        { label: t('nav.commands'), path: '/commands' },
        { label: t('nav.docs'), path: '/guide' },
    ];

    // Handle Discord OAuth callback
    useEffect(() => {
        const stored = localStorage.getItem('discord_user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }

        const hash = window.location.hash;
        if (hash.includes('access_token')) {
            const params = new URLSearchParams(hash.slice(1));
            const token = params.get('access_token');
            if (token) {
                fetch('https://discord.com/api/v10/users/@me', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.id) {
                            const u = {
                                id: data.id,
                                username: data.global_name || data.username,
                                avatar: data.avatar
                                    ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=64`
                                    : null,
                            };
                            setUser(u);
                            localStorage.setItem('discord_user', JSON.stringify(u));
                        }
                        window.history.replaceState(null, '', window.location.pathname);
                    })
                    .catch(() => {});
            }
        }
    }, []);

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('discord_user');
        setAnchorEl(null);
    };

    const toggleLang = () => setLang(lang === 'de' ? 'en' : 'de');

    return (
        <>
            <AppBar position="fixed" elevation={0}
                sx={{
                    background: scrolled ? 'rgba(9,9,11,0.85)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
                    borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    transition: 'all 0.3s ease',
                }}>
                <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 1100, mx: 'auto', width: '100%', py: 0.5 }}>
                    <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
                        <Box component="img" src="/logo.png" alt="ByteBots" sx={{ width: 30, height: 30, objectFit: 'contain' }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#fafafa' }}>
                            ByteBots
                        </Typography>
                    </Box>

                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center' }}>
                        {navItems.map((item) => (
                            <Button key={item.path} component={Link} to={item.path} size="small"
                                sx={{
                                    color: location.pathname === item.path ? '#fafafa' : '#a1a1aa',
                                    fontSize: '0.875rem', fontWeight: 500, px: 2,
                                    '&:hover': { color: '#fafafa', bgcolor: 'transparent' },
                                }}>
                                {item.label}
                            </Button>
                        ))}
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                        {/* Language Toggle */}
                        <Button size="small" onClick={toggleLang}
                            startIcon={<LanguageIcon sx={{ fontSize: 18 }} />}
                            sx={{
                                color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 600, minWidth: 0, px: 1.5,
                                '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)' },
                            }}>
                            {lang.toUpperCase()}
                        </Button>

                        {/* Discord Login / User */}
                        {user ? (
                            <>
                                <Button size="small" onClick={(e) => setAnchorEl(e.currentTarget)}
                                    sx={{
                                        color: '#fafafa', textTransform: 'none', gap: 1, px: 1.5,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                    }}>
                                    <Avatar src={user.avatar} sx={{ width: 26, height: 26, fontSize: '0.75rem' }}>
                                        {user.username?.[0]}
                                    </Avatar>
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.username}</Typography>
                                </Button>
                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                                    PaperProps={{
                                        sx: { bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', mt: 1, minWidth: 160 },
                                    }}>
                                    <MenuItem onClick={handleLogout} sx={{ fontSize: '0.85rem', color: '#a1a1aa', gap: 1.5 }}>
                                        <LogoutIcon sx={{ fontSize: 16 }} /> {t('nav.logout')}
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <Button size="small" href={DISCORD_LOGIN_URL}
                                startIcon={<DiscordIcon />}
                                sx={{
                                    bgcolor: '#5865F2', color: '#fff', px: 2, py: 0.7,
                                    fontSize: '0.82rem', fontWeight: 600,
                                    '&:hover': { bgcolor: '#4752C4' },
                                }}>
                                {t('nav.login')}
                            </Button>
                        )}
                    </Stack>

                    <IconButton sx={{ display: { md: 'none' }, color: '#fafafa' }} onClick={() => setMobileOpen(true)}>
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}
                PaperProps={{ sx: { bgcolor: '#09090b', width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)' } }}>
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#a1a1aa' }}><CloseIcon /></IconButton>
                    </Box>
                    <List>
                        {navItems.map((item) => (
                            <ListItem key={item.path} disablePadding>
                                <ListItemButton component={Link} to={item.path} onClick={() => setMobileOpen(false)}
                                    sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Mobile Language Toggle */}
                    <Button fullWidth size="small" onClick={toggleLang}
                        startIcon={<LanguageIcon sx={{ fontSize: 18 }} />}
                        sx={{ color: '#a1a1aa', justifyContent: 'flex-start', px: 2, mb: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                        {lang === 'de' ? 'English' : 'Deutsch'}
                    </Button>

                    {/* Mobile Discord Login */}
                    {user ? (
                        <Stack spacing={1}>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1 }}>
                                <Avatar src={user.avatar} sx={{ width: 28, height: 28 }}>{user.username?.[0]}</Avatar>
                                <Typography sx={{ fontSize: '0.9rem', color: '#fafafa' }}>{user.username}</Typography>
                            </Stack>
                            <Button fullWidth size="small" onClick={handleLogout}
                                startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                                sx={{ color: '#a1a1aa', justifyContent: 'flex-start', px: 2 }}>
                                {t('nav.logout')}
                            </Button>
                        </Stack>
                    ) : (
                        <Button fullWidth href={DISCORD_LOGIN_URL}
                            startIcon={<DiscordIcon />}
                            sx={{ bgcolor: '#5865F2', color: '#fff', '&:hover': { bgcolor: '#4752C4' } }}>
                            {t('nav.login')}
                        </Button>
                    )}
                </Box>
            </Drawer>
            <Toolbar />
        </>
    );
}

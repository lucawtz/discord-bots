import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Button, IconButton, Box, Drawer,
    List, ListItem, ListItemButton, ListItemText, useScrollTrigger,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navItems = [
    { label: 'Bots', path: '/bots' },
    { label: 'Commands', path: '/commands' },
    { label: 'Docs', path: '/guide' },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 30 });

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
                            <Button key={item.label} component={Link} to={item.path} size="small"
                                sx={{
                                    color: location.pathname === item.path ? '#fafafa' : '#a1a1aa',
                                    fontSize: '0.875rem', fontWeight: 500, px: 2,
                                    '&:hover': { color: '#fafafa', bgcolor: 'transparent' },
                                }}>
                                {item.label}
                            </Button>
                        ))}
                    </Box>

                    <Button component={Link} to="/bots" size="small"
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            color: '#fff', px: 2.5, py: 0.8, fontSize: '0.85rem',
                            '&:hover': { background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)' },
                        }}>
                        Get Started
                    </Button>

                    <IconButton sx={{ display: { md: 'none' }, color: '#fafafa' }} onClick={() => setMobileOpen(true)}>
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}
                PaperProps={{ sx: { bgcolor: '#09090b', width: 260, borderLeft: '1px solid rgba(255,255,255,0.06)' } }}>
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#a1a1aa' }}><CloseIcon /></IconButton>
                    </Box>
                    <List>
                        {navItems.map((item) => (
                            <ListItem key={item.label} disablePadding>
                                <ListItemButton component={Link} to={item.path} onClick={() => setMobileOpen(false)}
                                    sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Button component={Link} to="/bots" fullWidth onClick={() => setMobileOpen(false)}
                        sx={{ mt: 2, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }}>
                        Get Started
                    </Button>
                </Box>
            </Drawer>
            <Toolbar />
        </>
    );
}

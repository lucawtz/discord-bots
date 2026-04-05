import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Button, IconButton, Box, Drawer,
    List, ListItem, ListItemButton, ListItemText, useScrollTrigger,
    Collapse, Paper, Popper, Grow, ClickAwayListener,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const botItems = [
    { label: 'BeatByte', subtitle: 'Music Bot', path: '/bots/music-bot', icon: <MusicNoteIcon sx={{ fontSize: 20 }} /> },
    { label: 'Soundboard', subtitle: 'Sound Effects', path: '/bots/soundboard-bot', icon: <GraphicEqIcon sx={{ fontSize: 20 }} /> },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [botsOpen, setBotsOpen] = useState(false);
    const [mobileBotsOpen, setMobileBotsOpen] = useState(false);
    const location = useLocation();
    const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 50 });
    const anchorRef = useRef(null);

    useEffect(() => { setBotsOpen(false); setMobileOpen(false); }, [location.pathname]);

    const isBotPage = location.pathname.startsWith('/bots/');

    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    background: scrolled ? 'rgba(10,10,15,0.95)' : 'rgba(10,10,15,0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid',
                    borderColor: scrolled ? 'divider' : 'transparent',
                    transition: 'all 0.3s ease',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 1200, mx: 'auto', width: '100%' }}>
                    <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
                        <SmartToyIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{
                            fontWeight: 700, fontSize: '1.15rem',
                            background: 'linear-gradient(135deg, #08fcfe, #f0a0ee)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            ByteBots
                        </Typography>
                    </Box>

                    {/* Desktop Nav */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center' }}>
                        <Button
                            component={Link} to="/"
                            sx={{
                                color: location.pathname === '/' ? 'text.primary' : 'text.secondary',
                                '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' },
                            }}
                        >
                            Home
                        </Button>

                        {/* Bots Dropdown */}
                        <Button
                            ref={anchorRef}
                            onClick={() => setBotsOpen(prev => !prev)}
                            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18, transition: 'transform 0.2s', transform: botsOpen ? 'rotate(180deg)' : 'none' }} />}
                            sx={{
                                color: isBotPage ? 'text.primary' : 'text.secondary',
                                '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' },
                            }}
                        >
                            Bots
                        </Button>
                        <Popper open={botsOpen} anchorEl={anchorRef.current} placement="bottom-start" transition sx={{ zIndex: 1300 }}>
                            {({ TransitionProps }) => (
                                <Grow {...TransitionProps} style={{ transformOrigin: '0 0' }}>
                                    <Paper sx={{
                                        mt: 1, bgcolor: '#16161f', border: '1px solid', borderColor: 'divider',
                                        borderRadius: 2, overflow: 'hidden', minWidth: 240,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}>
                                        <ClickAwayListener onClickAway={() => setBotsOpen(false)}>
                                            <Box>
                                                {botItems.map((item) => (
                                                    <Box
                                                        key={item.path}
                                                        component={Link}
                                                        to={item.path}
                                                        sx={{
                                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                                            px: 2.5, py: 1.5, textDecoration: 'none',
                                                            color: location.pathname === item.path ? 'text.primary' : 'text.secondary',
                                                            bgcolor: location.pathname === item.path ? 'rgba(255,255,255,0.04)' : 'transparent',
                                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'text.primary' },
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                    >
                                                        <Box sx={{ color: 'primary.main', display: 'flex' }}>{item.icon}</Box>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                                                {item.label}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.disabled">
                                                                {item.subtitle}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </ClickAwayListener>
                                    </Paper>
                                </Grow>
                            )}
                        </Popper>

                        <Button
                            component={Link} to="/bots/music-bot" hash="#download"
                            onClick={() => {
                                if (location.pathname === '/bots/music-bot') {
                                    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' },
                            }}
                        >
                            Download
                        </Button>
                    </Box>

                    {/* Get Started CTA */}
                    <Button
                        component={Link} to="/bots/music-bot"
                        variant="contained" size="small"
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', fontWeight: 600, px: 2.5,
                            '&:hover': { boxShadow: '0 0 20px rgba(8,252,254,0.25)' },
                        }}
                    >
                        Loslegen
                    </Button>

                    <IconButton
                        sx={{ display: { md: 'none' }, color: 'text.primary' }}
                        onClick={() => setMobileOpen(true)}
                    >
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                PaperProps={{ sx: { bgcolor: '#0e0e16', width: 280 } }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, px: 1 }}>
                        <SmartToyIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                            ByteBots
                        </Typography>
                    </Box>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton component={Link} to="/" onClick={() => setMobileOpen(false)} selected={location.pathname === '/'}>
                                <ListItemText primary="Home" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => setMobileBotsOpen(prev => !prev)}>
                                <ListItemText primary="Bots" />
                                {mobileBotsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={mobileBotsOpen}>
                            <List disablePadding sx={{ pl: 2 }}>
                                {botItems.map((item) => (
                                    <ListItem key={item.path} disablePadding>
                                        <ListItemButton
                                            component={Link} to={item.path}
                                            onClick={() => setMobileOpen(false)}
                                            selected={location.pathname === item.path}
                                            sx={{ borderRadius: 1 }}
                                        >
                                            <Box sx={{ mr: 1.5, color: 'primary.main', display: 'flex' }}>{item.icon}</Box>
                                            <ListItemText primary={item.label} secondary={item.subtitle} />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Collapse>
                        <ListItem disablePadding>
                            <ListItemButton component={Link} to="/bots/music-bot" onClick={() => setMobileOpen(false)}>
                                <ListItemText primary="Download" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                    <Button
                        component={Link} to="/bots/music-bot"
                        variant="contained" fullWidth
                        onClick={() => setMobileOpen(false)}
                        sx={{
                            mt: 3, background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', fontWeight: 600,
                        }}
                    >
                        Loslegen
                    </Button>
                </Box>
            </Drawer>

            <Toolbar />
        </>
    );
}

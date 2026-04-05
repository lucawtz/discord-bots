import { Link, useLocation } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { PLAYER_HEIGHT } from './BottomPlayer';

const tabs = [
    { label: 'Home', icon: <HomeIcon />, path: '/app' },
    { label: 'Suche', icon: <SearchIcon />, path: '/app/search' },
    { label: 'Bibliothek', icon: <LibraryMusicIcon />, path: '/app/library' },
];

export const MOBILE_NAV_HEIGHT = 56;

export default function MobileNav() {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/app') return location.pathname === '/app';
        return location.pathname.startsWith(path);
    };

    return (
        <Box sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            bottom: PLAYER_HEIGHT,
            left: 0, right: 0,
            height: MOBILE_NAV_HEIGHT,
            bgcolor: '#0e0e16',
            borderTop: '1px solid',
            borderColor: 'rgba(255,255,255,0.06)',
            zIndex: 1250,
        }}>
            <Stack direction="row" sx={{ height: '100%' }}>
                {tabs.map((tab) => {
                    const active = isActive(tab.path);
                    return (
                        <Box
                            key={tab.path}
                            component={Link}
                            to={tab.path}
                            sx={{
                                flex: 1,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none', gap: 0.25,
                                color: active ? 'primary.main' : 'text.disabled',
                                transition: 'color 0.15s',
                                '&:hover': { color: active ? 'primary.main' : 'text.secondary' },
                                '& svg': { fontSize: 22, transition: 'transform 0.15s' },
                                ...(active && { '& svg': { fontSize: 22, transform: 'scale(1.1)' } }),
                            }}
                        >
                            {tab.icon}
                            <Typography variant="caption" sx={{
                                fontSize: '0.6rem', fontWeight: active ? 700 : 500,
                                letterSpacing: 0.3,
                            }}>
                                {tab.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}

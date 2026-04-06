import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Box } from '@mui/material';
import { useEffect } from 'react';

const pageTitles = {
    '/': 'ByteBots',
    '/bots': 'Bots | ByteBots',
    '/bots/music-bot': 'BeatByte | ByteBots',
    '/bots/soundboard-bot': 'EarTastic | ByteBots',
    '/commands': 'Commands | ByteBots',
    '/premium': 'Premium | ByteBots',
    '/guide': 'Guide | ByteBots',
    '/profile': 'Profil | ByteBots',
    '/status': 'Status | ByteBots',
    '/changelog': 'Changelog | ByteBots',
    '/impressum': 'Impressum | ByteBots',
    '/datenschutz': 'Datenschutz | ByteBots',
};

export default function Layout() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = pageTitles[location.pathname] || 'ByteBots';
    }, [location.pathname]);

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Gradient orbs */}
            <Box sx={{
                position: 'fixed', top: '-30%', left: '50%', transform: 'translateX(-50%)',
                width: 800, height: 800, borderRadius: '50%', opacity: 0.15,
                background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
                filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
            }} />
            <Box sx={{
                position: 'fixed', bottom: '-40%', right: '-10%',
                width: 600, height: 600, borderRadius: '50%', opacity: 0.08,
                background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)',
                filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
            }} />

            <Navbar />
            <Box component="main" sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <Outlet key={location.pathname} />
            </Box>
            <Footer />
        </Box>
    );
}

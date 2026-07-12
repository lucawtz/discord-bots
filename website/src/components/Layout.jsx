import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Box } from '@mui/material';
import { useEffect } from 'react';

const PAGE_TITLE = 'ByteBots';

export default function Layout() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = PAGE_TITLE;
    }, [location.pathname]);

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'clip' }}>
            <Navbar />
            <Box component="main" sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <Outlet key={location.pathname} />
            </Box>
            <Footer />
        </Box>
    );
}

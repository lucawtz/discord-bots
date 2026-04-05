import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Box } from '@mui/material';

export default function Layout() {
    const location = useLocation();

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Background glow effects */}
            <Box sx={{
                position: 'fixed', top: -200, right: -200, width: 600, height: 600,
                borderRadius: '50%', background: '#08fcfe', filter: 'blur(150px)',
                opacity: 0.06, pointerEvents: 'none', zIndex: 0,
            }} />
            <Box sx={{
                position: 'fixed', bottom: -200, left: -200, width: 600, height: 600,
                borderRadius: '50%', background: '#f0a0ee', filter: 'blur(150px)',
                opacity: 0.06, pointerEvents: 'none', zIndex: 0,
            }} />

            <Navbar />
            <Box component="main" sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <Outlet key={location.pathname} />
            </Box>
            <Footer />
        </Box>
    );
}

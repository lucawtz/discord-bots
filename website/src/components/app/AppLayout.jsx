import { Outlet, useLocation } from 'react-router-dom';
import { Box, keyframes } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import TopBar from './TopBar';
import BottomPlayer, { PLAYER_HEIGHT } from './BottomPlayer';
import MobileNav, { MOBILE_NAV_HEIGHT } from './MobileNav';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

export default function AppLayout() {
    const location = useLocation();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Background glow effects */}
            <Box sx={{
                position: 'fixed', top: -200, right: -200, width: 600, height: 600,
                borderRadius: '50%', background: '#08fcfe', filter: 'blur(180px)',
                opacity: 0.03, pointerEvents: 'none', zIndex: 0,
            }} />
            <Box sx={{
                position: 'fixed', bottom: -200, left: -200, width: 600, height: 600,
                borderRadius: '50%', background: '#f0a0ee', filter: 'blur(180px)',
                opacity: 0.03, pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Sidebar - Hidden on mobile */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Sidebar />
            </Box>

            {/* Main Content */}
            <Box sx={{
                flex: 1,
                ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
                mb: { xs: `${PLAYER_HEIGHT + MOBILE_NAV_HEIGHT}px`, md: `${PLAYER_HEIGHT}px` },
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                position: 'relative',
                zIndex: 1,
            }}>
                <TopBar />
                <Box component="main" sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: { xs: 1.5, sm: 3 },
                    py: 2,
                }}>
                    <Box key={location.pathname} sx={{
                        animation: `${fadeIn} 0.25s ease`,
                    }}>
                        <Outlet />
                    </Box>
                </Box>
            </Box>

            {/* Mobile Bottom Navigation */}
            <MobileNav />

            {/* Bottom Player */}
            <BottomPlayer />
        </Box>
    );
}

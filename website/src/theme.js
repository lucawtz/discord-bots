import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#a855f7', light: '#c084fc', dark: '#7c3aed' },
        secondary: { main: '#d946ef' },
        success: { main: '#34d399' },
        background: {
            default: '#09090b',
            paper: '#18181b',
        },
        text: {
            primary: '#fafafa',
            secondary: '#a1a1aa',
            disabled: '#52525b',
        },
        divider: 'rgba(255,255,255,0.06)',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontWeight: 800, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.015em' },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#27272a #09090b',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#27272a', borderRadius: 3 },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 },
            },
        },
    },
});

export default theme;

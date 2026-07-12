import { createTheme } from '@mui/material/styles';

export const DISPLAY_FONT = "'Space Grotesk', 'Inter', sans-serif";
export const MONO_FONT = "'JetBrains Mono', monospace";

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#a855f7', light: '#c084fc', dark: '#7c3aed' },
        secondary: { main: '#d946ef' },
        info: { main: '#22d3ee' },
        success: { main: '#22c55e' },
        background: {
            default: '#08080b',
            paper: '#141419',
        },
        text: {
            primary: '#fafafa',
            secondary: '#a1a1aa',
            disabled: '#71717a',
        },
        divider: 'rgba(255,255,255,0.07)',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.032em', lineHeight: 1.05 },
        h2: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06 },
        h3: { fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
        h4: { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.015em' },
        h5: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
        h6: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#27272a #08080b',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#27272a', borderRadius: 3 },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600, borderRadius: 12 },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'linear-gradient(180deg, #141419, #0d0d12)',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 18,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 500 },
            },
        },
    },
});

export default theme;

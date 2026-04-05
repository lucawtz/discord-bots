import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#08fcfe' },
        secondary: { main: '#f0a0ee' },
        success: { main: '#8df286' },
        warning: { main: '#ffa64d' },
        info: { main: '#b48afe' },
        background: {
            default: '#0a0a0f',
            paper: '#1a1a25',
        },
        text: {
            primary: '#f0f0f5',
            secondary: '#a0a0b5',
            disabled: '#6a6a80',
        },
        divider: '#2a2a3a',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontWeight: 800 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
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
                    scrollbarColor: '#2a2a3a #0a0a0f',
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-track': { background: '#0a0a0f' },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#2a2a3a',
                        borderRadius: 4,
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 12,
                    padding: '10px 24px',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    borderRadius: 50,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #2a2a3a',
                },
            },
        },
    },
});

export default theme;

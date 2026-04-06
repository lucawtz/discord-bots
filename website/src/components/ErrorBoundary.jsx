import { Component } from 'react';
import { Box, Typography, Button, Container, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#09090b', px: 3 }}>
                <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
                    <Typography sx={{
                        fontSize: '4rem', fontWeight: 900, lineHeight: 1, mb: 2,
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Oops
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700, color: '#fafafa' }}>
                        Something went wrong
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        An unexpected error occurred. Please try reloading the page.
                    </Typography>
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Button variant="contained" startIcon={<RefreshIcon />}
                            onClick={() => window.location.reload()}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', px: 3,
                                '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                            }}>
                            Reload
                        </Button>
                        <Button variant="outlined" startIcon={<HomeIcon />}
                            onClick={() => { window.location.href = '/'; }}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa', px: 3,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' },
                            }}>
                            Home
                        </Button>
                    </Stack>
                </Container>
            </Box>
        );
    }
}

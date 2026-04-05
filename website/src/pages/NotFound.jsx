import { Link } from 'react-router-dom';
import { Box, Typography, Container, Button, Stack } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLanguage } from '../i18n/LanguageContext';

export default function NotFound() {
    const { t } = useLanguage();

    return (
        <Box sx={{ py: 16, px: 3, textAlign: 'center' }}>
            <Container maxWidth="sm">
                <Typography sx={{
                    fontSize: '8rem', fontWeight: 900, lineHeight: 1,
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    mb: 2,
                }}>
                    404
                </Typography>
                <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 700 }}>
                    {t('notFound.title', 'Page not found')}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 360, mx: 'auto' }}>
                    {t('notFound.subtitle', 'The page you are looking for does not exist or has been moved.')}
                </Typography>
                <Stack direction="row" spacing={1.5} justifyContent="center">
                    <Button variant="contained" component={Link} to="/" startIcon={<HomeIcon />}
                        sx={{
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', px: 3,
                            '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                        }}>
                        {t('notFound.home', 'Home')}
                    </Button>
                    <Button variant="outlined" onClick={() => window.history.back()} startIcon={<ArrowBackIcon />}
                        sx={{
                            borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa', px: 3,
                            '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' },
                        }}>
                        {t('notFound.back', 'Go back')}
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}

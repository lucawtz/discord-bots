import { Box, Typography, Container, Stack, Button, Card, CardContent, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import { useLanguage } from '../i18n/LanguageContext';

export default function Premium() {
    const { t } = useLanguage();

    const freeTier = t('premium.freeTier');
    const premiumTier = t('premium.premiumTier');

    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="md">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Chip icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />} label="Coming Soon" size="small"
                        sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: '#c084fc' }} />
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5 }}>
                        {t('premium.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                        {t('premium.subtitle')}
                    </Typography>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} justifyContent="center">
                    {/* Free */}
                    <Card sx={{ flex: 1, maxWidth: 360, mx: 'auto', width: '100%', bgcolor: '#18181b' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: 2 }}>{t('premium.free')}</Typography>
                            <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mb: 0.5 }}>
                                <Typography variant="h3" sx={{ fontWeight: 800 }}>0 EUR</Typography>
                                <Typography variant="body2" color="text.disabled">{t('premium.perMonth')}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block' }}>
                                {t('premium.freeForever')}
                            </Typography>
                            <Stack spacing={1.5}>
                                {(Array.isArray(freeTier) ? freeTier : []).map((f, i) => (
                                    <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                                        <CheckIcon sx={{ fontSize: 16, color: '#52525b' }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>{f}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                            <Button fullWidth variant="outlined" disabled sx={{ mt: 4, borderColor: 'rgba(255,255,255,0.08)', color: '#52525b' }}>
                                {t('premium.currentPlan')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Premium */}
                    <Card sx={{
                        flex: 1, maxWidth: 360, mx: 'auto', width: '100%', bgcolor: '#18181b',
                        border: '1px solid rgba(168,85,247,0.2)',
                        boxShadow: '0 0 40px rgba(168,85,247,0.06)',
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="overline" sx={{ color: '#a855f7', letterSpacing: 2 }}>{t('premium.premiumLabel')}</Typography>
                            <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mb: 0.5 }}>
                                <Typography variant="h3" sx={{ fontWeight: 800 }}>TBA</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block' }}>
                                {t('premium.perServerMonth')}
                            </Typography>
                            <Stack spacing={1.5}>
                                {(Array.isArray(premiumTier) ? premiumTier : []).map((f, i) => (
                                    <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                                        <CheckIcon sx={{ fontSize: 16, color: '#a855f7' }} />
                                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{f}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                            <Button fullWidth variant="contained" disabled
                                sx={{ mt: 4, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' } }}>
                                {t('bots.comingSoon')}
                            </Button>
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}

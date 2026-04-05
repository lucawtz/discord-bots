import { Box, Typography, Link as MuiLink, Stack, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function Footer() {
    const { t } = useLanguage();

    const columns = [
        {
            title: t('footer.product'),
            links: [
                { label: 'BeatByte', path: '/bots/music-bot' },
                { label: 'EarTastic', path: '/bots/soundboard-bot' },
                { label: 'Commands', path: '/commands' },
            ],
        },
        {
            title: t('footer.resources'),
            links: [
                { label: t('footer.documentation'), path: '/guide' },
                { label: 'Status', path: '/status' },
                { label: 'Changelog', path: '/changelog' },
            ],
        },
        {
            title: t('footer.legal'),
            links: [
                { label: 'Impressum', path: '/impressum' },
                { label: 'Datenschutz', path: '/datenschutz' },
            ],
        },
    ];

    return (
        <Box component="footer" sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', mt: 'auto' }}>
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 5, sm: 8 }}>
                    {/* Brand */}
                    <Box sx={{ minWidth: 160 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            <Box component="img" src="/logo.png" alt="" sx={{ width: 24, height: 24, objectFit: 'contain' }} />
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>ByteBots</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {t('footer.tagline')}
                        </Typography>
                    </Box>

                    {/* Link Columns */}
                    {columns.map((col) => (
                        <Box key={col.title}>
                            <Typography variant="caption" sx={{
                                color: '#fafafa', fontWeight: 600, fontSize: '0.75rem',
                                textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block',
                            }}>
                                {col.title}
                            </Typography>
                            <Stack spacing={1}>
                                {col.links.map((link) => (
                                    <MuiLink key={link.label} component={Link} to={link.path}
                                        color="text.secondary" underline="none" variant="body2"
                                        sx={{ fontSize: '0.85rem', '&:hover': { color: '#c084fc' }, transition: 'color 0.15s' }}>
                                        {link.label}
                                    </MuiLink>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>

                <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                        &copy; {new Date().getFullYear()} {t('footer.copyright')}
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}

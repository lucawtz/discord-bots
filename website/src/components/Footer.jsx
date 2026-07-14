import { Box, Typography, Link as MuiLink, Stack, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORT_INVITE } from '../config';
import { BrandLogo, DISPLAY_FONT } from './ui';

export default function Footer() {
    const { t } = useLanguage();

    const links = [
        { label: t('nav.bots'), path: '/bots' },
        { label: t('nav.commands'), path: '/commands' },
        { label: t('nav.docs'), path: '/guide' },
        { label: 'Status', path: '/status' },
        { label: 'Changelog', path: '/changelog' },
        { label: t('nav.support'), href: SUPPORT_INVITE, external: true },
        { label: 'Impressum', path: '/impressum' },
        { label: 'Datenschutz', path: '/datenschutz' },
        { label: t('nutzungsbedingungen.title'), path: '/nutzungsbedingungen' },
    ];

    return (
        <Box component="footer" sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', mt: 'auto', bgcolor: '#08080b' }}>
            <Container maxWidth="lg" sx={{ py: 5.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={2.5}>
                    <Stack direction="row" alignItems="center" spacing={1.25} component={Link} to="/" sx={{ textDecoration: 'none' }}>
                        <BrandLogo size={34} />
                        <Box>
                            <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1rem', color: '#fafafa', lineHeight: 1.2 }}>
                                ByteBots
                            </Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: '#71717a' }}>
                                bytebots.de · © {new Date().getFullYear()}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={3}>
                        {links.map((link) => (
                            <MuiLink key={link.label}
                                {...(link.external
                                    ? { href: link.href, target: '_blank', rel: 'noopener' }
                                    : { component: Link, to: link.path })}
                                underline="none"
                                sx={{ color: '#a1a1aa', fontSize: '0.875rem', '&:hover': { color: '#fafafa' }, transition: 'color 0.15s' }}>
                                {link.label}
                            </MuiLink>
                        ))}
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}

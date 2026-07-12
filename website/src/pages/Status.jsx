import { Box, Typography, Container, Stack, Card, keyframes } from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHead, ACCENTS, MONO_FONT, DISPLAY_FONT } from '../components/ui';

const pulse = keyframes`
    50% { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
`;

function BotIcon({ accent, children }) {
    return (
        <Box sx={{
            width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
            background: `linear-gradient(135deg, ${accent.main}, ${accent.second})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {children}
        </Box>
    );
}

function NeutralIcon({ children }) {
    return (
        <Box sx={{
            width: 38, height: 38, borderRadius: '11px', flexShrink: 0, fontSize: 17,
            bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.26)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {children}
        </Box>
    );
}

export default function Status() {
    const { t } = useLanguage();

    const services = [
        {
            name: 'BeatByte', subtitle: t('status.musicBot'),
            icon: <BotIcon accent={ACCENTS.beat}><Box component="span" sx={{ fontSize: 19, color: '#fff', lineHeight: 1 }}>♫</Box></BotIcon>,
        },
        {
            name: 'EarTastic', subtitle: t('status.soundboardBot'),
            icon: (
                <BotIcon accent={ACCENTS.ear}>
                    <Box component="svg" viewBox="0 0 512 512" sx={{ width: 20, height: 20 }}>
                        <path fill="#fff" d="M280 96 176 190H104a24 24 0 0 0-24 24v84a24 24 0 0 0 24 24h72l104 94a16 16 0 0 0 26-12V108a16 16 0 0 0-26-12z" />
                    </Box>
                </BotIcon>
            ),
        },
        { name: 'Web Player', subtitle: 'beatbyte.bytebots.de', icon: <NeutralIcon>🎧</NeutralIcon> },
        { name: 'Soundboard Dashboard', subtitle: 'soundboard.bytebots.de', icon: <NeutralIcon>🔊</NeutralIcon> },
        { name: t('status.webApi'), subtitle: 'api.bytebots.de', icon: <NeutralIcon>🌐</NeutralIcon> },
    ];

    return (
        <Box sx={{ pb: { xs: 8, md: 10 } }}>
            <PageHead kicker="Status" title={t('status.pageTitle')} />

            <Container maxWidth="md" sx={{ mt: 4 }}>
                {/* Banner */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                    px: 3.5, py: 3, borderRadius: '18px',
                    background: 'linear-gradient(120deg, rgba(34,197,94,0.13), rgba(34,197,94,0.04))',
                    border: '1px solid rgba(34,197,94,0.3)',
                }}>
                    <Box sx={{
                        width: 14, height: 14, borderRadius: '50%', bgcolor: '#22c55e', flexShrink: 0,
                        boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
                        animation: `${pulse} 2.2s ease-in-out infinite`,
                    }} />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.35rem' }}>
                            {t('status.allOperational')}
                        </Typography>
                    </Box>
                </Box>

                {/* Services */}
                <Card elevation={0} sx={{ mt: 2.75, overflow: 'hidden' }}>
                    {services.map((s, i) => (
                        <Stack key={s.name} direction="row" alignItems="center" spacing={2}
                            sx={{ px: 3, py: 2.5, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            {s.icon}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</Typography>
                                <Typography sx={{
                                    fontFamily: MONO_FONT, fontSize: '0.66rem', letterSpacing: '0.1em',
                                    textTransform: 'uppercase', color: '#71717a',
                                }}>
                                    {s.subtitle}
                                </Typography>
                            </Box>
                            <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.9,
                                fontSize: '0.78rem', fontWeight: 600, color: '#4ade80',
                                bgcolor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                                px: 1.5, py: 0.6, borderRadius: '999px', flexShrink: 0,
                            }}>
                                {t('status.operational')}
                            </Box>
                        </Stack>
                    ))}
                </Card>
            </Container>
        </Box>
    );
}

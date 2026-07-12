import { Box, Typography, Container, Stack, Card, Button, keyframes } from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import { useLiveStatus, formatUptime } from '../hooks/useLiveStatus';
import { PageHead, BotAvatar, MONO_FONT, DISPLAY_FONT, GHOST_BTN_SX } from '../components/ui';

const pulse = keyframes`
    50% { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const BANNERS = {
    checking: {
        color: '#a1a1aa', bg: 'linear-gradient(120deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: 'rgba(255,255,255,0.12)',
    },
    up: {
        color: '#22c55e', bg: 'linear-gradient(120deg, rgba(34,197,94,0.13), rgba(34,197,94,0.04))',
        border: 'rgba(34,197,94,0.3)',
    },
    degraded: {
        color: '#eab308', bg: 'linear-gradient(120deg, rgba(234,179,8,0.13), rgba(234,179,8,0.04))',
        border: 'rgba(234,179,8,0.3)',
    },
};

function NeutralIcon({ children }) {
    return (
        <Box sx={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0, fontSize: 17,
            bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.26)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {children}
        </Box>
    );
}

function StateBadge({ result, t }) {
    if (result.state === 'checking') {
        return (
            <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1, flexShrink: 0,
                fontSize: '0.78rem', fontWeight: 600, color: '#a1a1aa',
                bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                px: 1.5, py: 0.6, borderRadius: '999px',
            }}>
                <Box sx={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#c084fc',
                    animation: `${spin} 0.8s linear infinite`,
                }} />
                {t('status.checking')}
            </Box>
        );
    }
    const up = result.state === 'up';
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.9, flexShrink: 0,
            fontSize: '0.78rem', fontWeight: 600,
            color: up ? '#4ade80' : '#f87171',
            bgcolor: up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: up ? '1px solid rgba(34,197,94,0.28)' : '1px solid rgba(239,68,68,0.28)',
            px: 1.5, py: 0.6, borderRadius: '999px',
        }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: up ? '#4ade80' : '#f87171' }} />
            {up ? t('status.operational') : t('status.unreachable')}
            {up && Number.isFinite(result.ms) && (
                <Box component="span" sx={{ fontFamily: MONO_FONT, fontSize: '0.69rem', color: '#a1a1aa', fontWeight: 500 }}>
                    {result.ms} ms
                </Box>
            )}
        </Box>
    );
}

export default function Status() {
    const { t } = useLanguage();
    const { status, refresh, checkedAt } = useLiveStatus();

    const earDetails = [];
    if (status.ear.data?.uptime) earDetails.push(`${t('status.uptime')} ${formatUptime(status.ear.data.uptime)}`);
    if (Number.isFinite(status.ear.data?.sounds)) earDetails.push(`${status.ear.data.sounds} Sounds`);

    const services = [
        {
            id: 'beat', name: 'BeatByte', sub: `${t('status.beatSub')} · beatbyte.bytebots.de`,
            icon: <BotAvatar bot="beat" size={38} />, result: status.beat,
        },
        {
            id: 'ear', name: 'EarTastic', sub: `${t('status.earSub')} · soundboard.bytebots.de`,
            icon: <BotAvatar bot="ear" size={38} />, result: status.ear,
            details: earDetails.join(' · ') || null,
        },
        {
            id: 'dashboard', name: 'Soundboard Dashboard', sub: 'soundboard.bytebots.de',
            icon: <NeutralIcon>🔊</NeutralIcon>, result: status.dashboard,
        },
        {
            id: 'website', name: t('status.website'), sub: 'bytebots.de',
            icon: <NeutralIcon>🌐</NeutralIcon>, result: status.website,
        },
    ];

    const anyChecking = services.some((s) => s.result.state === 'checking');
    const downCount = services.filter((s) => s.result.state === 'down').length;
    const bannerKey = anyChecking ? 'checking' : downCount > 0 ? 'degraded' : 'up';
    const banner = BANNERS[bannerKey];
    const bannerTitle = bannerKey === 'checking' ? t('status.checkingBanner')
        : bannerKey === 'up' ? t('status.allOperational')
        : t('status.partialOutage');

    return (
        <Box sx={{ pb: { xs: 8, md: 10 } }}>
            <PageHead kicker="Status" title={t('status.pageTitle')} />

            <Container maxWidth="md" sx={{ mt: 4 }}>
                {/* Banner */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                    px: 3.5, py: 3, borderRadius: '18px',
                    background: banner.bg,
                    border: `1px solid ${banner.border}`,
                }}>
                    <Box sx={{
                        width: 14, height: 14, borderRadius: '50%', bgcolor: banner.color, flexShrink: 0,
                        ...(bannerKey === 'up' ? {
                            boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
                            animation: `${pulse} 2.2s ease-in-out infinite`,
                        } : {}),
                    }} />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.35rem' }}>
                            {bannerTitle}
                        </Typography>
                        {bannerKey === 'degraded' && (
                            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>
                                {downCount}/{services.length} {t('status.servicesUnreachable')}
                            </Typography>
                        )}
                    </Box>
                    <Button onClick={refresh} disabled={anyChecking}
                        sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                        {t('status.recheck')}
                    </Button>
                </Box>

                {/* Services */}
                <Card elevation={0} sx={{ mt: 2.75, overflow: 'hidden' }}>
                    {services.map((s, i) => (
                        <Stack key={s.id} direction="row" alignItems="center" spacing={2}
                            sx={{ px: 3, py: 2.5, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            {s.icon}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</Typography>
                                <Typography sx={{
                                    fontFamily: MONO_FONT, fontSize: '0.66rem', letterSpacing: '0.08em',
                                    textTransform: 'uppercase', color: '#71717a',
                                }}>
                                    {s.sub}
                                </Typography>
                                {s.details && (
                                    <Typography sx={{ fontSize: '0.78rem', color: '#a1a1aa', mt: 0.4 }}>
                                        {s.details}
                                    </Typography>
                                )}
                            </Box>
                            <StateBadge result={s.result} t={t} />
                        </Stack>
                    ))}
                </Card>

                <Typography sx={{ fontSize: '0.81rem', color: '#71717a', mt: 1.75 }}>
                    {t('status.liveNote')}
                    {checkedAt && ` · ${t('status.lastChecked')}: ${checkedAt.toLocaleTimeString()}`}
                </Typography>
            </Container>
        </Box>
    );
}

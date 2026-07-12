import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, Stack, Container, keyframes,
} from '@mui/material';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';
import { useLiveStatus } from '../hooks/useLiveStatus';
import {
    PageHead, BotAvatar, ACCENTS, MONO_FONT, DISPLAY_FONT, GHOST_BTN_SX,
} from '../components/ui';
import { BeatMockup, EarMockup } from '../components/DiscordMockups';

const pulse = keyframes`
    50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
`;

function LiveChip({ state, t }) {
    const cfg = {
        up: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.28)', label: t('bots.online') },
        down: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)', label: t('bots.offline') },
        checking: { color: '#a1a1aa', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', label: t('bots.checking') },
    }[state] ?? { color: '#a1a1aa', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', label: t('bots.checking') };
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.9, height: 26, px: 1.4,
            borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0,
            color: cfg.color, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
        }}>
            <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color,
                ...(state === 'up' ? { boxShadow: '0 0 0 3px rgba(34,197,94,0.25)', animation: `${pulse} 2.2s ease-in-out infinite` } : {}),
            }} />
            {cfg.label}
        </Box>
    );
}

function BotRow({ bot, liveState, t, flip }) {
    const { accent } = bot;
    return (
        <Card elevation={0} sx={{ position: 'relative', overflow: 'hidden', p: { xs: 3, md: 5 } }}>
            {/* Halos */}
            <Box sx={{
                position: 'absolute', width: 420, height: 420, top: -180, right: flip ? 'auto' : -120, left: flip ? -120 : 'auto',
                pointerEvents: 'none', background: `radial-gradient(circle, ${accent.main}47, transparent 66%)`,
            }} />
            <Box sx={{
                position: 'absolute', width: 300, height: 300, bottom: -160, left: flip ? 'auto' : -80, right: flip ? -80 : 'auto',
                pointerEvents: 'none', background: `radial-gradient(circle, ${accent.second}29, transparent 66%)`,
            }} />

            <Box sx={{
                position: 'relative', display: 'grid', alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
                gap: { xs: 4, md: 6 },
            }}>
                <Box sx={{ order: { xs: 0, md: flip ? 1 : 0 } }}>
                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                        <BotAvatar bot={bot.avatar} size={64} />
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                                <Typography variant="h3" sx={{ fontSize: '1.7rem' }}>{bot.name}</Typography>
                                <LiveChip state={liveState} t={t} />
                            </Stack>
                            <Typography sx={{
                                fontFamily: MONO_FONT, fontSize: '0.75rem', letterSpacing: '0.16em',
                                textTransform: 'uppercase', color: accent.main, mt: 0.4,
                            }}>
                                {bot.role}
                            </Typography>
                        </Box>
                    </Stack>

                    <Typography sx={{ color: 'text.secondary', fontSize: '1rem', lineHeight: 1.6, mt: 2.5 }}>
                        {bot.blurb}
                    </Typography>

                    <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                        {bot.points.map((point) => (
                            <Stack key={point} direction="row" spacing={1.4} alignItems="flex-start">
                                <Box component="span" sx={{ color: accent.main, fontWeight: 800, lineHeight: 1.45, flexShrink: 0 }}>✓</Box>
                                <Typography sx={{ fontSize: '0.92rem', color: '#c9c9d1', lineHeight: 1.45 }}>{point}</Typography>
                            </Stack>
                        ))}
                    </Stack>

                    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 3.25 }}>
                        <Button href={bot.inviteUrl} target="_blank" rel="noopener" sx={{
                            height: 44, px: 2.5, fontSize: '0.95rem', fontWeight: 600, borderRadius: '12px',
                            background: `linear-gradient(120deg, ${accent.main}, ${accent.second})`,
                            color: '#0a0a0a',
                            boxShadow: `0 10px 30px -12px ${accent.main}b3`,
                            transition: 'all 0.18s',
                            '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
                        }}>
                            {t('bots.addToDiscord')}
                        </Button>
                        <Button href={bot.webAppUrl} target="_blank" rel="noopener" sx={GHOST_BTN_SX}>
                            {t('bots.openWebApp')}
                        </Button>
                        <Button component={Link} to={bot.path}
                            sx={{ ...GHOST_BTN_SX, bgcolor: 'transparent', borderColor: 'transparent', color: '#a1a1aa', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' } }}>
                            {t('bots.details')} →
                        </Button>
                    </Stack>

                    <Typography sx={{ fontSize: '0.78rem', color: '#71717a', mt: 1.75 }}>
                        {t('bots.optnote')} · <Box component="span" sx={{ fontFamily: MONO_FONT, color: accent.main }}>{bot.domain}</Box>
                    </Typography>
                </Box>

                <Box sx={{ order: { xs: 1, md: flip ? 0 : 1 }, minWidth: 0 }}>
                    {bot.mockup}
                </Box>
            </Box>
        </Card>
    );
}

export default function Bots() {
    const { t } = useLanguage();
    const { status } = useLiveStatus();

    const flow = [
        { title: t('bots.flow1Title'), text: t('bots.flow1Text') },
        { title: t('bots.flow2Title'), text: t('bots.flow2Text') },
        { title: t('bots.flow3Title'), text: t('bots.flow3Text') },
    ];

    const bots = [
        {
            name: 'BeatByte', role: t('bots.beatbyte.subtitle'), blurb: t('bots.beatbyte.blurb'),
            points: t('bots.beatbyte.points'),
            accent: ACCENTS.beat, avatar: 'beat', mockup: <BeatMockup t={t} />, live: status.beat.state,
            inviteUrl: BEATBYTE_INVITE, webAppUrl: 'https://beatbyte.bytebots.de', domain: 'beatbyte.bytebots.de',
            path: '/bots/music-bot',
        },
        {
            name: 'EarTastic', role: t('bots.eartastic.subtitle'), blurb: t('bots.eartastic.blurb'),
            points: t('bots.eartastic.points'),
            accent: ACCENTS.ear, avatar: 'ear', mockup: <EarMockup t={t} />, live: status.ear.state,
            inviteUrl: SOUNDBOARD_INVITE, webAppUrl: 'https://soundboard.bytebots.de', domain: 'soundboard.bytebots.de',
            path: '/bots/soundboard-bot',
        },
    ];

    return (
        <Box sx={{ pb: { xs: 8, md: 10 }, position: 'relative', overflow: 'hidden' }}>
            {/* Seiten-Glows */}
            <Box sx={{
                position: 'absolute', width: 640, height: 640, left: -180, top: -220, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(168,85,247,0.22), transparent 62%)',
            }} />
            <Box sx={{
                position: 'absolute', width: 560, height: 560, right: -160, top: 60, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(34,211,238,0.12), transparent 62%)',
            }} />

            <Box sx={{ position: 'relative' }}>
                <PageHead kicker={t('bots.kicker')} title={t('bots.pageTitle')} titleAccent={t('bots.pageTitleAccent')} lead={t('bots.lead')} />

                <Container maxWidth="lg" sx={{ mt: 5 }}>
                    {/* Bot-Produkt-Rows */}
                    <Stack spacing={3.5}>
                        {bots.map((bot, i) => (
                            <BotRow key={bot.name} bot={bot} liveState={bot.live} t={t} flip={i % 2 === 1} />
                        ))}
                    </Stack>

                    {/* 3-Schritte-Flow */}
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.75} alignItems="stretch" sx={{ mt: 3.5 }}>
                        {flow.map((step, i) => (
                            <Card key={i} elevation={0} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.75, px: 2.75, py: 2.5 }}>
                                <Box sx={{
                                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                                    bgcolor: 'rgba(168,85,247,0.14)', border: '1px solid rgba(168,85,247,0.3)',
                                    color: '#c084fc', fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.06rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {i + 1}
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{step.title}</Typography>
                                    <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.55 }}>{step.text}</Typography>
                                </Box>
                            </Card>
                        ))}
                    </Stack>

                    {/* Kommt bald */}
                    <Box sx={{
                        mt: 3.5, p: { xs: 3, md: 4 }, borderRadius: '18px',
                        border: '1px dashed rgba(255,255,255,0.17)', bgcolor: 'rgba(255,255,255,0.015)',
                        display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap',
                    }}>
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 1,
                            fontFamily: MONO_FONT, fontSize: '0.75rem', fontWeight: 600,
                            letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c084fc',
                            bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                            borderRadius: '999px', px: 1.9, py: 0.9, flexShrink: 0,
                        }}>
                            {t('bots.soonBadge')}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.25rem', color: '#e4e4e7' }}>
                                {t('bots.soonTitle')}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55, mt: 0.5 }}>
                                {t('bots.soonText')}
                            </Typography>
                        </Box>
                        <Button href="mailto:kontakt@bytebots.de"
                            sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                            {t('bots.suggest')}
                        </Button>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}

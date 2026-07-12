import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, Stack, Container, keyframes,
} from '@mui/material';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';
import {
    PageHead, BotAvatar, ACCENTS, MONO_FONT, DISPLAY_FONT, GHOST_BTN_SX,
} from '../components/ui';

const prog = keyframes`
    0% { width: 12%; }
    92% { width: 86%; }
    100% { width: 86%; }
`;

const eq = keyframes`
    0%, 100% { transform: scaleY(0.28); }
    50% { transform: scaleY(1); }
`;

function BeatPreview() {
    return (
        <Box sx={{ bgcolor: '#141419', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', p: 1.75 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{
                    width: 46, height: 46, borderRadius: '9px', position: 'relative', overflow: 'hidden', flexShrink: 0,
                    background: 'repeating-linear-gradient(45deg, #2b2140, #2b2140 7px, #231b36 7px, #231b36 14px)',
                }}>
                    <Box sx={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: MONO_FONT, fontSize: '0.5rem', color: '#8b7bb0', letterSpacing: '0.1em',
                    }}>
                        COVER
                    </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '0.875rem' }}>Strobe</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>deadmau5</Typography>
                    <Box sx={{ height: 6, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden', mt: 0.9 }}>
                        <Box sx={{
                            height: '100%', borderRadius: '4px',
                            background: 'linear-gradient(90deg, #a855f7, #d946ef)',
                            animation: `${prog} 9s linear infinite`,
                        }} />
                    </Box>
                </Box>
                <Stack direction="row" alignItems="flex-end" spacing="3px" sx={{ height: 20, flexShrink: 0 }}>
                    {[0, 0.3, 0.6, 0.15].map((delay) => (
                        <Box key={delay} sx={{
                            width: 4, height: '100%', borderRadius: '2px',
                            background: 'linear-gradient(#a855f7, #22d3ee)',
                            transformOrigin: 'bottom',
                            animation: `${eq} 1s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }} />
                    ))}
                </Stack>
            </Stack>
        </Box>
    );
}

function EarPreview() {
    const sounds = [
        { name: 'Airhorn', len: '0:02' },
        { name: 'Vine Boom', len: '0:01' },
        { name: 'Bruh', len: '0:01' },
        { name: 'Drop', len: '0:02' },
    ];
    return (
        <Box sx={{ bgcolor: '#141419', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', p: 1.75 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                {sounds.map((s) => (
                    <Box key={s.name} sx={{
                        px: 0.75, py: 1.25, borderRadius: '12px', textAlign: 'center',
                        background: 'linear-gradient(180deg, #1b1b22, #141419)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.72rem', fontWeight: 600, color: '#c9c9d1',
                        cursor: 'default', transition: 'all 0.15s',
                        '&:hover': { borderColor: 'rgba(34,211,238,0.45)', color: '#fff', transform: 'translateY(-2px)' },
                    }}>
                        {s.name}
                        <Box component="small" sx={{ display: 'block', fontFamily: MONO_FONT, fontSize: '0.56rem', color: '#5fd6e8', mt: 0.5 }}>
                            {s.len}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function SrcChip({ accent, children }) {
    return (
        <Box component="span" sx={{
            display: 'inline-flex', alignItems: 'center', height: 28, px: 1.5, borderRadius: '8px',
            fontSize: '0.78rem', fontWeight: 600, color: '#e4e4e7',
            bgcolor: `${accent}1f`, border: `1px solid ${accent}47`,
        }}>
            {children}
        </Box>
    );
}

function BotCard({ bot, t }) {
    const { accent } = bot;
    return (
        <Card elevation={0} sx={{ position: 'relative', overflow: 'hidden', p: 3.5, display: 'flex', flexDirection: 'column' }}>
            {/* Halo */}
            <Box sx={{
                position: 'absolute', width: 300, height: 300, top: -130, right: -90, pointerEvents: 'none',
                background: `radial-gradient(circle, ${accent.main}52, transparent 66%)`,
            }} />
            <Stack direction="row" alignItems="center" spacing={1.75} sx={{ position: 'relative' }}>
                <BotAvatar bot={bot.avatar} size={56} radius={16} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                        {bot.name}
                    </Typography>
                    <Typography sx={{
                        fontFamily: MONO_FONT, fontSize: '0.75rem', letterSpacing: '0.16em',
                        textTransform: 'uppercase', color: accent.main,
                    }}>
                        {bot.role}
                    </Typography>
                </Box>
                <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75, height: 26, px: 1.4, borderRadius: '999px',
                    fontSize: '0.72rem', fontWeight: 600, color: '#4ade80', flexShrink: 0,
                    bgcolor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                }}>
                    {t('bots.noLogin')}
                </Box>
            </Stack>

            <Typography sx={{ color: 'text.secondary', fontSize: '0.91rem', lineHeight: 1.55, mt: 2, mb: 1.75, position: 'relative' }}>
                {bot.blurb}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2, position: 'relative' }}>
                {bot.chips.map((chip) => (
                    <SrcChip key={chip} accent={accent.main}>{chip}</SrcChip>
                ))}
            </Stack>

            <Box sx={{ position: 'relative' }}>{bot.preview}</Box>

            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 2, position: 'relative' }}>
                <Button href={bot.inviteUrl} target="_blank" rel="noopener" sx={{
                    height: 38, px: 1.9, fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px',
                    background: `linear-gradient(120deg, ${accent.main}, ${accent.second})`,
                    color: '#0a0a0a',
                    boxShadow: `0 10px 30px -12px ${accent.main}b3`,
                    transition: 'all 0.18s',
                    '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
                }}>
                    {t('bots.addToDiscord')}
                </Button>
                <Button href={bot.webAppUrl} target="_blank" rel="noopener"
                    sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                    {t('bots.openWebApp')}
                </Button>
                <Button component={Link} to={bot.path}
                    sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px', bgcolor: 'transparent', borderColor: 'transparent', color: '#a1a1aa', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' } }}>
                    {t('bots.details')} →
                </Button>
            </Stack>

            <Typography sx={{ fontSize: '0.75rem', color: '#71717a', mt: 1.5, position: 'relative' }}>
                {t('bots.optnote')} · <Box component="span" sx={{ fontFamily: MONO_FONT, color: accent.main }}>{bot.domain}</Box>
            </Typography>
        </Card>
    );
}

export default function Bots() {
    const { t } = useLanguage();

    const flow = [
        { title: t('bots.flow1Title'), text: t('bots.flow1Text') },
        { title: t('bots.flow2Title'), text: t('bots.flow2Text') },
        { title: t('bots.flow3Title'), text: t('bots.flow3Text') },
    ];

    const bots = [
        {
            name: 'BeatByte', role: t('bots.beatbyte.subtitle'), blurb: t('bots.beatbyte.blurb'),
            chips: t('bots.beatbyte.chips'),
            accent: ACCENTS.beat, preview: <BeatPreview />, avatar: 'beat',
            inviteUrl: BEATBYTE_INVITE, webAppUrl: 'https://beatbyte.bytebots.de', domain: 'beatbyte.bytebots.de',
            path: '/bots/music-bot',
        },
        {
            name: 'EarTastic', role: t('bots.eartastic.subtitle'), blurb: t('bots.eartastic.blurb'),
            chips: t('bots.eartastic.chips'),
            accent: ACCENTS.ear, preview: <EarPreview />, avatar: 'ear',
            inviteUrl: SOUNDBOARD_INVITE, webAppUrl: 'https://soundboard.bytebots.de', domain: 'soundboard.bytebots.de',
            path: '/bots/soundboard-bot',
        },
    ];

    return (
        <Box sx={{ pb: { xs: 8, md: 10 } }}>
            <PageHead kicker={t('bots.kicker')} title={t('bots.pageTitle')} titleAccent={t('bots.pageTitleAccent')} lead={t('bots.lead')} />

            <Container maxWidth="lg" sx={{ mt: 4 }}>
                {/* 3-Schritte-Flow */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.75} alignItems="stretch">
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

                {/* Bot-Karten */}
                <Box sx={{ display: 'grid', gap: 2.75, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 2.75 }}>
                    {bots.map((bot) => (
                        <BotCard key={bot.name} bot={bot} t={t} />
                    ))}
                </Box>

                {/* Kommt bald */}
                <Box sx={{
                    mt: 2.75, p: { xs: 3, md: 4 }, borderRadius: '18px',
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
    );
}

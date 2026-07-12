import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, Stack, Container, keyframes,
} from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';
import {
    Kicker, GradText, CmdChip, BotAvatar, ACCENTS, MONO_FONT, DISPLAY_FONT,
    PRIMARY_BTN_SX, GHOST_BTN_SX,
} from '../components/ui';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const floaty = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-13px); }
`;

const blink = keyframes`
    50% { opacity: 0; }
`;

function BotPill({ color, bg, children }) {
    return (
        <Box component="span" sx={{
            fontSize: '0.69rem', fontWeight: 700, px: 1.1, py: 0.4, borderRadius: '6px',
            color, bgcolor: bg, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
            {children}
        </Box>
    );
}

function CommandBarMockup({ t }) {
    const rows = [
        { cmd: '/play <link>', desc: t('home.mockPlayDesc'), pill: 'BeatByte', color: '#c084fc', bg: 'rgba(168,85,247,0.14)', selected: true },
        { cmd: '/sound <name>', desc: t('home.mockSoundDesc'), pill: 'EarTastic', color: '#5fd6e8', bg: 'rgba(34,211,238,0.14)' },
        { cmd: '/autodj', desc: t('home.mockDjDesc'), pill: 'BeatByte', color: '#c084fc', bg: 'rgba(168,85,247,0.14)' },
    ];

    return (
        <Box sx={{ animation: `${floaty} 6.5s ease-in-out infinite` }}>
            <Box sx={{
                bgcolor: '#1e1f24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                boxShadow: '0 44px 90px -34px rgba(0,0,0,0.85), 0 0 0 1px rgba(168,85,247,0.14)',
                overflow: 'hidden',
            }}>
                <Stack direction="row" alignItems="center" spacing={1.4}
                    sx={{ px: 2.25, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <Box sx={{
                        width: 28, height: 28, borderRadius: '8px',
                        background: 'linear-gradient(135deg, #a855f7, #22d3ee)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0a0a0a', fontWeight: 800, fontFamily: MONO_FONT, fontSize: '1rem',
                    }}>
                        /
                    </Box>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.94rem', color: '#e4e4e7' }}>play</Typography>
                    <Box sx={{ width: 2, height: 20, bgcolor: '#c084fc', animation: `${blink} 1.1s step-end infinite` }} />
                    <Box sx={{
                        ml: 'auto !important', display: 'inline-flex', alignItems: 'center', height: 26, px: 1.4,
                        borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: '#a1a1aa',
                    }}>
                        ↵ Enter
                    </Box>
                </Stack>
                {rows.map((row, i) => (
                    <Box key={row.cmd} sx={{
                        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center',
                        px: 2.25, py: 1.6,
                        bgcolor: row.selected ? 'rgba(168,85,247,0.1)' : 'transparent',
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                        <CmdChip>{row.cmd}</CmdChip>
                        <Typography sx={{ fontSize: '0.845rem', color: '#a1a1aa', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.desc}
                        </Typography>
                        <BotPill color={row.color} bg={row.bg}>{row.pill}</BotPill>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function FlowSteps({ steps }) {
    return (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.75} alignItems="stretch">
            {steps.map((step, i) => (
                <Card key={i} elevation={0} sx={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 1.75, px: 2.75, py: 2.5,
                }}>
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
    );
}

function SectionHeader({ kicker, title, action }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 3 }}>
            <Box>
                <Kicker>{kicker}</Kicker>
                <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, mt: 1.25 }}>{title}</Typography>
            </Box>
            {action}
        </Stack>
    );
}

export default function Home() {
    const { t } = useLanguage();

    const whatTiles = [
        { icon: '🤖', title: t('home.what1Title'), text: t('home.what1Text') },
        { icon: '🌐', title: t('home.what2Title'), text: t('home.what2Text') },
        { icon: '✦', title: t('home.what3Title'), text: t('home.what3Text') },
    ];

    const steps = [
        { title: t('home.step1Title'), text: t('home.step1Text') },
        { title: t('home.step2Title'), text: t('home.step2Text') },
        { title: t('home.step3Title'), text: t('home.step3Text') },
    ];

    const teasers = [
        {
            name: 'BeatByte', role: t('home.roleMusic'), text: t('home.beatTeaser'),
            path: '/bots/music-bot', accent: ACCENTS.beat, avatar: 'beat',
        },
        {
            name: 'EarTastic', role: t('home.roleSound'), text: t('home.earTeaser'),
            path: '/bots/soundboard-bot', accent: ACCENTS.ear, avatar: 'ear',
        },
    ];

    return (
        <Box>
            {/* ──── Hero ──── */}
            <Box sx={{ position: 'relative', pt: { xs: 8, md: 11.5 }, pb: { xs: 8, md: 10 }, overflow: 'hidden' }}>
                {/* Background: Glows + Grid */}
                <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <Box sx={{
                        position: 'absolute', width: 640, height: 640, left: -140, top: -180,
                        background: 'radial-gradient(circle, rgba(168,85,247,0.3), transparent 62%)',
                    }} />
                    <Box sx={{
                        position: 'absolute', width: 560, height: 560, right: -120, top: 20,
                        background: 'radial-gradient(circle, rgba(34,211,238,0.15), transparent 62%)',
                    }} />
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                        WebkitMask: 'radial-gradient(circle at 46% 28%, #000, transparent 72%)',
                        mask: 'radial-gradient(circle at 46% 28%, #000, transparent 72%)',
                    }} />
                </Box>

                <Container maxWidth="lg" sx={{ position: 'relative' }}>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1.06fr 0.94fr' },
                        gap: { xs: 6, md: 7 }, alignItems: 'center',
                    }}>
                        <Box sx={{ animation: `${fadeIn} 0.5s ease` }}>
                            <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.9, height: 30, px: 1.6,
                                borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                fontSize: '0.82rem', fontWeight: 500, color: '#a1a1aa',
                            }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#a855f7' }} />
                                {t('home.badge')}
                            </Box>
                            <Typography variant="h1" sx={{
                                fontSize: { xs: '2.6rem', sm: '3.2rem', md: '3.75rem' },
                                lineHeight: 1.03, mt: 2.5, mb: 2.75,
                            }}>
                                {t('home.heroTitle1')}<br />
                                <GradText>{t('home.heroTitle2')}</GradText>
                            </Typography>
                            <Typography sx={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'text.secondary', maxWidth: 520 }}>
                                {t('home.heroSubtitle')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 3.75 }}>
                                <Button component={Link} to="/bots" sx={PRIMARY_BTN_SX}>{t('home.inviteBot')}</Button>
                                <Button component={Link} to="/guide" sx={GHOST_BTN_SX}>{t('home.howItWorks')}</Button>
                            </Stack>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 3.25 }}>
                                {[t('home.trust1'), t('home.trust2'), t('home.trust3')].map((item) => (
                                    <Typography key={item} sx={{ fontSize: '0.875rem', color: '#71717a' }}>✓ {item}</Typography>
                                ))}
                            </Stack>
                        </Box>

                        <Box sx={{ animation: `${fadeIn} 0.5s ease 0.1s both` }}>
                            <CommandBarMockup t={t} />
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* ──── Was ist ByteBots ──── */}
            <Box sx={{ pb: { xs: 7, md: 9 } }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center' }}>
                        <Kicker>{t('home.whatKicker')}</Kicker>
                        <Typography variant="h2" sx={{ fontSize: { xs: '1.85rem', md: '2.35rem' }, mt: 1.25 }}>
                            {t('home.whatTitle')}
                        </Typography>
                        <Typography sx={{ maxWidth: 620, mx: 'auto', mt: 1.75, fontSize: '1rem', lineHeight: 1.6, color: 'text.secondary' }}>
                            {t('home.whatLead')}
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'grid', gap: 2.5, mt: 4.75,
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    }}>
                        {whatTiles.map((tile) => (
                            <Card key={tile.title} elevation={0} sx={{
                                p: 3, transition: 'all 0.2s',
                                '&:hover': { borderColor: 'rgba(168,85,247,0.4)', transform: 'translateY(-3px)' },
                            }}>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: '12px', mb: 1.75, fontSize: 20,
                                    bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.26)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {tile.icon}
                                </Box>
                                <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: '1.06rem', mb: 0.75 }}>
                                    {tile.title}
                                </Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55 }}>
                                    {tile.text}
                                </Typography>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ──── Unsere Bots ──── */}
            <Box sx={{ pb: { xs: 7, md: 9 } }}>
                <Container maxWidth="lg">
                    <SectionHeader kicker={t('home.botsKicker')} title={t('home.botsTitle')}
                        action={
                            <Button component={Link} to="/bots" sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.875rem', borderRadius: '10px' }}>
                                {t('home.allDetails')} →
                            </Button>
                        } />
                    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {teasers.map((bot) => (
                            <Card key={bot.name} component={Link} to={bot.path} elevation={0} sx={{
                                display: 'flex', gap: 2.25, alignItems: 'center', p: 3.25,
                                textDecoration: 'none', cursor: 'pointer', transition: 'all 0.18s',
                                '&:hover': {
                                    borderColor: `${bot.accent.main}73`,
                                    transform: 'translateY(-3px)',
                                },
                            }}>
                                <BotAvatar bot={bot.avatar} size={52} radius={16} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75 }}>
                                        <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#fafafa' }}>
                                            {bot.name}
                                        </Typography>
                                        <Box component="span" sx={{
                                            fontFamily: MONO_FONT, fontSize: '0.66rem', fontWeight: 600,
                                            letterSpacing: '0.1em', textTransform: 'uppercase',
                                            color: bot.accent.main, bgcolor: `${bot.accent.main}21`,
                                            border: `1px solid ${bot.accent.main}47`,
                                            px: 1, py: 0.25, borderRadius: '6px',
                                        }}>
                                            {bot.role}
                                        </Box>
                                    </Stack>
                                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55 }}>
                                        {bot.text}
                                    </Typography>
                                </Box>
                                <Typography sx={{ ml: 'auto', color: bot.accent.main, fontSize: '1.4rem', flexShrink: 0 }}>→</Typography>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ──── So einfach geht's ──── */}
            <Box sx={{ pb: { xs: 7, md: 9 } }}>
                <Container maxWidth="lg">
                    <SectionHeader kicker={t('home.stepsKicker')} title={t('home.stepsTitle')}
                        action={
                            <Button component={Link} to="/guide" sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.875rem', borderRadius: '10px' }}>
                                {t('home.fullGuide')} →
                            </Button>
                        } />
                    <FlowSteps steps={steps} />
                </Container>
            </Box>

            {/* ──── CTA ──── */}
            <Box sx={{ pb: { xs: 8, md: 10 } }}>
                <Container maxWidth="lg">
                    <Box sx={{
                        position: 'relative', overflow: 'hidden', textAlign: 'center',
                        px: { xs: 3, md: 5 }, py: { xs: 5, md: 7 }, borderRadius: '24px',
                        background: 'linear-gradient(120deg, rgba(124,58,237,0.2), rgba(217,70,239,0.1) 50%, rgba(34,211,238,0.13))',
                        border: '1px solid rgba(168,85,247,0.24)',
                    }}>
                        <Box sx={{
                            position: 'absolute', width: 640, height: 640, right: -160, top: -220, opacity: 0.6,
                            background: 'radial-gradient(circle, rgba(168,85,247,0.3), transparent 62%)',
                            pointerEvents: 'none',
                        }} />
                        <Box sx={{ position: 'relative' }}>
                            <Typography variant="h2" sx={{ fontSize: { xs: '1.85rem', md: '2.35rem' }, mb: 1.5 }}>
                                {t('home.ctaTitle')}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', mb: 3.25, fontSize: '1rem' }}>
                                {t('home.ctaText')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
                                <Button component={Link} to="/bots" sx={PRIMARY_BTN_SX}>{t('home.inviteBot')}</Button>
                                <Button component={Link} to="/guide" sx={GHOST_BTN_SX}>{t('home.toGuide')}</Button>
                            </Stack>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}

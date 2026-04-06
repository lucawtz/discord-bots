import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, CardContent,
    Stack, Container, Avatar, keyframes, Chip,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WebIcon from '@mui/icons-material/Web';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import PeopleIcon from '@mui/icons-material/People';
import UpdateIcon from '@mui/icons-material/Update';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const BEATBYTE_AVATAR = 'https://cdn.discordapp.com/avatars/1488919318472298647/f2829ad185e6a0fff4d7d064cdfdbb3e.png?size=128';
const EARTASTIC_AVATAR = 'https://cdn.discordapp.com/avatars/1488966705488330932/96e1cfe3af1b12407f702d356d916038.png?size=128';

export default function Home() {
    const { t } = useLanguage();

    const bots = [
        {
            name: 'BeatByte',
            subtitle: t('bots.beatbyte.subtitle'),
            description: t('bots.beatbyte.description'),
            avatar: BEATBYTE_AVATAR,
            stats: ['23 Commands', '5 Platforms', 'Web Player'],
            path: '/bots/music-bot',
            inviteUrl: BEATBYTE_INVITE,
            accent: '#a855f7',
        },
        {
            name: 'EarTastic',
            subtitle: t('bots.eartastic.subtitle'),
            description: t('bots.eartastic.description'),
            avatar: EARTASTIC_AVATAR,
            stats: ['5 Commands', '10 Categories', 'Dashboard'],
            path: '/bots/soundboard-bot',
            inviteUrl: SOUNDBOARD_INVITE,
            accent: '#38bdf8',
        },
    ];

    const whyUs = [
        { icon: <WebIcon />, title: t('home.whyUs.webApps'), text: t('home.whyUs.webAppsText') },
        { icon: <DesktopWindowsIcon />, title: t('home.whyUs.desktopApps'), text: t('home.whyUs.desktopAppsText') },
        { icon: <SecurityIcon />, title: t('home.whyUs.selfHosted'), text: t('home.whyUs.selfHostedText') },
        { icon: <SpeedIcon />, title: t('home.whyUs.uptime'), text: t('home.whyUs.uptimeText') },
        { icon: <PeopleIcon />, title: t('home.whyUs.easyToUse'), text: t('home.whyUs.easyToUseText') },
        { icon: <UpdateIcon />, title: t('home.whyUs.updates'), text: t('home.whyUs.updatesText') },
    ];

    return (
        <Box>
            {/* ──── Hero ──── */}
            <Box sx={{
                minHeight: '85vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', px: 3,
                position: 'relative', overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute', inset: 0, opacity: 0.3,
                    backgroundImage: 'radial-gradient(rgba(168,85,247,0.08) 1px, transparent 1px)',
                    backgroundSize: '32px 32px', pointerEvents: 'none',
                }} />
                <Box sx={{
                    position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: 600, height: 600, borderRadius: '50%', opacity: 0.12,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />

                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Bot Avatars floating */}
                    <Stack direction="row" spacing={-1.5} justifyContent="center" sx={{ mb: 4, animation: `${fadeIn} 0.5s ease` }}>
                        <Avatar src={BEATBYTE_AVATAR} sx={{
                            width: 52, height: 52, borderRadius: 2.5,
                            border: '3px solid #09090b',
                            boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
                        }} />
                        <Avatar src={EARTASTIC_AVATAR} sx={{
                            width: 52, height: 52, borderRadius: 2.5,
                            border: '3px solid #09090b',
                            boxShadow: '0 4px 16px rgba(56,189,248,0.3)',
                        }} />
                    </Stack>

                    <Typography variant="h1" sx={{
                        fontSize: { xs: '2.25rem', sm: '3rem', md: '3.75rem' },
                        fontWeight: 800, lineHeight: 1.1, mb: 2.5, letterSpacing: '-0.02em',
                        animation: `${fadeIn} 0.5s ease 0.05s both`,
                    }}>
                        {t('home.heroTitle1')}{' '}
                        <Box component="span" sx={{
                            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 50%, #38bdf8 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {t('home.heroTitle2')}
                        </Box>
                    </Typography>

                    <Typography color="text.secondary" sx={{
                        mb: 5, maxWidth: 480, mx: 'auto', lineHeight: 1.8, fontSize: '1.05rem',
                        animation: `${fadeIn} 0.5s ease 0.1s both`,
                    }}>
                        {t('home.heroSubtitle')}
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center"
                        sx={{ animation: `${fadeIn} 0.5s ease 0.15s both` }}>
                        <Button variant="contained" href="#bots" size="large"
                            onClick={(e) => { e.preventDefault(); document.getElementById('bots')?.scrollIntoView({ behavior: 'smooth' }); }}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                px: 4, py: 1.5, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: '0 8px 32px rgba(168,85,247,0.3)',
                                '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)', boxShadow: '0 12px 40px rgba(168,85,247,0.4)' },
                            }}>
                            {t('home.discoverBots')}
                        </Button>
                        <Button variant="outlined" component={Link} to="/guide" size="large"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa',
                                px: 4, py: 1.5, fontSize: '0.95rem',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa', bgcolor: 'rgba(255,255,255,0.03)' },
                            }}>
                            {t('home.documentation')}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* ──── Bots ──── */}
            <Box id="bots" sx={{ py: 14, px: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="overline" sx={{ color: '#a855f7', letterSpacing: 3, fontSize: '0.7rem', mb: 1.5, display: 'block' }}>
                            {t('home.ourBots')}
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 700 }}>
                            {t('home.chooseBotTitle')}
                        </Typography>
                    </Box>

                    <Stack spacing={3}>
                        {bots.map((bot, i) => (
                            <Card key={i}
                                component={Link} to={bot.path}
                                sx={{
                                    bgcolor: '#18181b', textDecoration: 'none',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 4, overflow: 'hidden',
                                    transition: 'all 0.25s ease',
                                    animation: `${fadeIn} 0.4s ease ${i * 0.1}s both`,
                                    '&:hover': {
                                        borderColor: `${bot.accent}33`,
                                        boxShadow: `0 16px 64px ${bot.accent}15`,
                                        transform: 'translateY(-4px)',
                                        '& .bot-arrow': { opacity: 1, transform: 'translateX(0)' },
                                    },
                                }}>
                                <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 5 }} alignItems={{ md: 'center' }}>
                                        {/* Left: Avatar + Info */}
                                        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                                            <Avatar src={bot.avatar} sx={{
                                                width: 64, height: 64, borderRadius: 3,
                                                boxShadow: `0 8px 24px ${bot.accent}30`,
                                                flexShrink: 0,
                                            }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{bot.name}</Typography>
                                                    <Chip label={bot.subtitle} size="small" sx={{
                                                        height: 22, fontSize: '0.7rem', fontWeight: 500,
                                                        bgcolor: `${bot.accent}15`, color: bot.accent,
                                                    }} />
                                                </Stack>
                                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                                    {bot.description}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        {/* Right: Stats + Actions */}
                                        <Stack spacing={2} alignItems={{ xs: 'flex-start', md: 'flex-end' }} sx={{ flexShrink: 0 }}>
                                            <Stack direction="row" spacing={1}>
                                                {bot.stats.map((s) => (
                                                    <Typography key={s} variant="caption" sx={{
                                                        px: 1.5, py: 0.4, borderRadius: 1.5,
                                                        bgcolor: 'rgba(255,255,255,0.04)',
                                                        color: '#71717a', fontSize: '0.72rem', fontWeight: 500,
                                                        border: '1px solid rgba(255,255,255,0.04)',
                                                    }}>
                                                        {s}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Button variant="contained" href={bot.inviteUrl} target="_blank"
                                                    onClick={(e) => e.stopPropagation()}
                                                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                                    sx={{
                                                        background: `linear-gradient(135deg, ${bot.accent}, ${bot.accent}cc)`,
                                                        color: '#fff', px: 3, py: 0.9, fontSize: '0.85rem', fontWeight: 600,
                                                        boxShadow: `0 4px 16px ${bot.accent}30`,
                                                        '&:hover': { boxShadow: `0 6px 24px ${bot.accent}40` },
                                                    }}>
                                                    {t('home.invite')}
                                                </Button>
                                                <ArrowForwardIcon className="bot-arrow" sx={{
                                                    fontSize: 20, color: '#52525b',
                                                    opacity: 0, transform: 'translateX(-8px)',
                                                    transition: 'all 0.25s ease',
                                                }} />
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Coming Soon */}
                        <Box sx={{
                            p: 4, borderRadius: 4, border: '1px dashed rgba(255,255,255,0.08)',
                            textAlign: 'center', opacity: 0.5,
                            animation: `${fadeIn} 0.4s ease 0.2s both`,
                        }}>
                            <AutoAwesomeIcon sx={{ fontSize: 28, color: '#52525b', mb: 1 }} />
                            <Typography variant="body2" color="text.disabled">
                                {t('bots.comingSoonBot.description')}
                            </Typography>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ──── Why ByteBots ──── */}
            <Box sx={{ py: 14, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="overline" sx={{ color: '#a855f7', letterSpacing: 3, fontSize: '0.7rem', mb: 1.5, display: 'block' }}>
                            {t('home.whyBytebots')}
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 700 }}>
                            {t('home.whatSetsUsApart')}
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 2,
                    }}>
                        {whyUs.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3.5, borderRadius: 3, bgcolor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'rgba(168,85,247,0.15)', transform: 'translateY(-2px)' },
                            }}>
                                <Box sx={{
                                    width: 40, height: 40, borderRadius: 2, mb: 2,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: 'rgba(168,85,247,0.08)', color: '#a855f7',
                                    '& svg': { fontSize: 20 },
                                }}>
                                    {f.icon}
                                </Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 600, fontSize: '0.95rem' }}>{f.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ──── CTA ──── */}
            <Box sx={{
                py: 14, px: 3, textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                position: 'relative',
            }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 500, height: 500, borderRadius: '50%', opacity: 0.06,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 60%)',
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="sm" sx={{ position: 'relative' }}>
                    <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                        {t('home.readyTitle')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                        {t('home.readySubtitle')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                        <Button variant="contained" href="#bots" size="large"
                            onClick={(e) => { e.preventDefault(); document.getElementById('bots')?.scrollIntoView({ behavior: 'smooth' }); }}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                px: 4, py: 1.5, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: '0 8px 32px rgba(168,85,247,0.3)',
                                '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                            }}>
                            {t('home.viewBots')}
                        </Button>
                        <Button variant="outlined" component={Link} to="/guide" size="large"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa',
                                px: 4, py: 1.5, fontSize: '0.95rem',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' },
                            }}>
                            {t('home.documentation')}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

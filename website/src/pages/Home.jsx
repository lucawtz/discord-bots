import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, CardContent,
    Chip, Stack, Container, Avatar, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
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
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
`;

export default function Home() {
    const { t } = useLanguage();

    const bots = [
        {
            name: 'BeatByte', subtitle: 'Music Bot', commands: 16,
            description: t('bots.beatbyte.description'),
            icon: <MusicNoteIcon sx={{ fontSize: 22 }} />,
            discordId: '1488919318472298647',
            avatarHash: 'f2829ad185e6a0fff4d7d064cdfdbb3e',
            tags: ['Music', 'Streaming', 'Web App', 'Desktop App'],
            highlights: ['16 Commands', 'Web Player', 'Auto-DJ', 'Playlists'],
            path: '/bots/music-bot', inviteUrl: BEATBYTE_INVITE,
        },
        {
            name: 'EarTastic', subtitle: 'Soundboard Bot', commands: 5,
            description: t('bots.eartastic.description'),
            icon: <GraphicEqIcon sx={{ fontSize: 22 }} />,
            discordId: '1488966705488330932',
            avatarHash: '96e1cfe3af1b12407f702d356d916038',
            tags: ['Fun', 'Sounds', 'Dashboard'],
            highlights: ['Custom Upload', 'Web Dashboard', '10 Kategorien', 'Favoriten'],
            path: '/bots/soundboard-bot', inviteUrl: SOUNDBOARD_INVITE,
        },
        {
            name: t('bots.comingSoonBot.name'), subtitle: t('home.inDevelopment'), commands: null,
            description: t('bots.comingSoonBot.description'),
            icon: <AutoAwesomeIcon sx={{ fontSize: 22 }} />,
            discordId: null, avatarHash: null,
            tags: ['Moderation', 'Utility'],
            highlights: [],
            path: null, inviteUrl: null, comingSoon: true,
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
                minHeight: '80vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', px: 3,
                position: 'relative',
            }}>
                <Box sx={{
                    position: 'absolute', inset: 0, opacity: 0.4,
                    backgroundImage: 'radial-gradient(rgba(168,85,247,0.07) 1px, transparent 1px)',
                    backgroundSize: '24px 24px', pointerEvents: 'none',
                }} />

                <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box component="img" src="/logo.png" alt="ByteBots"
                        sx={{
                            width: 80, height: 80, objectFit: 'contain', mb: 4,
                            filter: 'drop-shadow(0 0 24px rgba(168,85,247,0.25))',
                            animation: `${fadeIn} 0.5s ease`,
                        }}
                    />
                    <Typography variant="h2" sx={{
                        fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
                        lineHeight: 1.15, mb: 2.5,
                        animation: `${fadeIn} 0.5s ease 0.05s both`,
                    }}>
                        {t('home.heroTitle1')}{' '}
                        <Box component="span" sx={{
                            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {t('home.heroTitle2')}
                        </Box>
                    </Typography>
                    <Typography color="text.secondary" sx={{
                        mb: 5, maxWidth: 400, mx: 'auto', lineHeight: 1.8,
                        animation: `${fadeIn} 0.5s ease 0.1s both`,
                    }}>
                        {t('home.heroSubtitle')}
                    </Typography>
                    <Stack direction="row" spacing={1.5} justifyContent="center"
                        sx={{ animation: `${fadeIn} 0.5s ease 0.15s both` }}>
                        <Button variant="contained" href="#bots"
                            onClick={(e) => { e.preventDefault(); document.getElementById('bots')?.scrollIntoView({ behavior: 'smooth' }); }}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                px: 3.5, py: 1.2,
                                '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                            }}>
                            {t('home.discoverBots')}
                        </Button>
                        <Button variant="outlined" component={Link} to="/guide"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa',
                                px: 3.5, py: 1.2,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa', bgcolor: 'rgba(255,255,255,0.03)' },
                            }}>
                            {t('home.documentation')}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* ──── Bots ──── */}
            <Box id="bots" sx={{ py: 12, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="overline" sx={{ color: '#a855f7', letterSpacing: 3, fontSize: '0.7rem', mb: 1.5, display: 'block' }}>
                            {t('home.ourBots')}
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5 }}>
                            {t('home.chooseBotTitle')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                            {t('home.chooseBotSubtitle')}
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 2.5,
                    }}>
                        {bots.map((bot, i) => (
                            <Card key={i} sx={{
                                bgcolor: '#18181b', opacity: bot.comingSoon ? 0.4 : 1,
                                transition: 'all 0.25s ease',
                                animation: `${fadeIn} 0.4s ease ${i * 0.08}s both`,
                                '&:hover': bot.comingSoon ? {} : {
                                    borderColor: 'rgba(168,85,247,0.2)',
                                    transform: 'translateY(-6px)',
                                    boxShadow: '0 16px 48px rgba(168,85,247,0.1)',
                                },
                            }}>
                                <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    {/* Header */}
                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                                        <Avatar
                                            src={bot.avatarHash ? `https://cdn.discordapp.com/avatars/${bot.discordId}/${bot.avatarHash}.png?size=128` : undefined}
                                            sx={{
                                                width: 42, height: 42, borderRadius: 2,
                                                bgcolor: bot.avatarHash ? 'transparent' : undefined,
                                                background: bot.avatarHash ? undefined : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                                color: '#fff',
                                            }}
                                        >
                                            {!bot.avatarHash && bot.icon}
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>{bot.name}</Typography>
                                            <Typography variant="caption" color="text.disabled">{bot.subtitle}</Typography>
                                        </Box>
                                    </Stack>

                                    {/* Description */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.7, flex: 1 }}>
                                        {bot.description}
                                    </Typography>

                                    {/* Highlights */}
                                    {bot.highlights?.length > 0 && (
                                        <Box sx={{ mb: 2.5 }}>
                                            {bot.highlights.map((h) => (
                                                <Typography key={h} variant="caption" sx={{
                                                    display: 'inline-block', mr: 0.5, mb: 0.5,
                                                    px: 1.5, py: 0.3, borderRadius: 1,
                                                    bgcolor: 'rgba(168,85,247,0.08)', color: '#c084fc',
                                                    fontSize: '0.7rem',
                                                }}>
                                                    {h}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Tags */}
                                    <Stack direction="row" spacing={0.75} sx={{ mb: 3 }}>
                                        {bot.tags.map((tag) => (
                                            <Chip key={tag} label={tag} size="small"
                                                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#71717a', fontSize: '0.65rem', height: 22, borderRadius: 1 }} />
                                        ))}
                                    </Stack>

                                    {/* Actions */}
                                    {!bot.comingSoon ? (
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Button component={Link} to={bot.path} size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                                                sx={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 600, px: 0, '&:hover': { bgcolor: 'transparent', color: '#c084fc' } }}>
                                                {t('home.learnMore')}
                                            </Button>
                                            <Button size="small" variant="contained" href={bot.inviteUrl} target="_blank"
                                                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                                sx={{
                                                    ml: 'auto !important', fontSize: '0.8rem', px: 2, py: 0.6,
                                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                                    '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                                                }}>
                                                {t('home.invite')}
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>{t('home.inDevelopment')}</Typography>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ──── Why ByteBots ──── */}
            <Box sx={{ py: 12, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="overline" sx={{ color: '#a855f7', letterSpacing: 3, fontSize: '0.7rem', mb: 1.5, display: 'block' }}>
                            {t('home.whyBytebots')}
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
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
                                p: 3, borderRadius: 3, bgcolor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'rgba(168,85,247,0.15)' },
                            }}>
                                <Box sx={{
                                    width: 36, height: 36, borderRadius: 1.5, mb: 2,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: 'rgba(168,85,247,0.08)', color: '#a855f7',
                                    '& svg': { fontSize: 18 },
                                }}>
                                    {f.icon}
                                </Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{f.title}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ──── CTA ──── */}
            <Box sx={{
                py: 12, px: 3, textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                position: 'relative',
            }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, height: 400, borderRadius: '50%', opacity: 0.08,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 60%)',
                    filter: 'blur(60px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="sm" sx={{ position: 'relative' }}>
                    <Typography variant="h4" sx={{ mb: 2 }}>{t('home.readyTitle')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        {t('home.readySubtitle')}
                    </Typography>
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Button variant="contained" href="#bots"
                            onClick={(e) => { e.preventDefault(); document.getElementById('bots')?.scrollIntoView({ behavior: 'smooth' }); }}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', px: 3.5,
                                '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                            }}>
                            {t('home.viewBots')}
                        </Button>
                        <Button variant="outlined" component={Link} to="/guide"
                            sx={{ borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa', px: 3.5,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' } }}>
                            {t('home.documentation')}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

import {
    Box, Typography, Container, Stack, Button, Chip, Avatar, keyframes,
} from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import StarIcon from '@mui/icons-material/Star';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CategoryIcon from '@mui/icons-material/Category';
import TuneIcon from '@mui/icons-material/Tune';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ImageIcon from '@mui/icons-material/Image';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CommandList from '../components/CommandList';
import { SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const AVATAR = 'https://cdn.discordapp.com/avatars/1488966705488330932/96e1cfe3af1b12407f702d356d916038.png?size=128';
const ACCENT = '#38bdf8';

export default function SoundboardBot() {
    const { t } = useLanguage();

    const categories = t('soundboardBot.categories');

    const features = [
        { icon: <LibraryMusicIcon />, title: t('soundboardBot.features.library'), text: t('soundboardBot.features.libraryText') },
        { icon: <CloudUploadIcon />, title: t('soundboardBot.features.uploads'), text: t('soundboardBot.features.uploadsText') },
        { icon: <StarIcon />, title: t('soundboardBot.features.favorites'), text: t('soundboardBot.features.favoritesText') },
        { icon: <DashboardIcon />, title: t('soundboardBot.features.dashboard'), text: t('soundboardBot.features.dashboardText') },
        { icon: <CategoryIcon />, title: t('soundboardBot.features.categories'), text: t('soundboardBot.features.categoriesText') },
        { icon: <TuneIcon />, title: t('soundboardBot.features.volume'), text: t('soundboardBot.features.volumeText') },
    ];

    const commands = [
        { name: '/sound <name>', description: t('soundboardBot.commands.sound') },
        { name: '/favorite <name>', description: t('soundboardBot.commands.favorite') },
        { name: '/soundboard', description: t('soundboardBot.commands.soundboard') },
        { name: '/dashboard', description: t('soundboardBot.commands.dashboard') },
        { name: '/volume <prozent>', description: t('soundboardBot.commands.volume') },
    ];

    return (
        <Box>
            {/* ── Hero ── */}
            <Box sx={{ pt: 14, pb: 10, px: 3, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{
                    position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: 600, height: 600, borderRadius: '50%', opacity: 0.1,
                    background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
                    <Avatar src={AVATAR} sx={{
                        width: 88, height: 88, borderRadius: 3, mx: 'auto', mb: 3,
                        boxShadow: `0 16px 48px ${ACCENT}40`,
                        animation: `${fadeInUp} 0.4s ease`,
                    }} />
                    <Typography variant="h1" sx={{
                        fontSize: { xs: '2.25rem', md: '3.25rem' }, fontWeight: 800,
                        letterSpacing: '-0.02em', mb: 2,
                        animation: `${fadeInUp} 0.4s ease 0.05s both`,
                    }}>
                        {t('soundboardBot.title')}
                    </Typography>
                    <Typography color="text.secondary" sx={{
                        maxWidth: 520, mx: 'auto', mb: 3, lineHeight: 1.7, fontSize: '1.05rem',
                        animation: `${fadeInUp} 0.4s ease 0.1s both`,
                    }}>
                        {t('soundboardBot.subtitle')}
                    </Typography>

                    {/* Category Pills */}
                    <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" useFlexGap
                        sx={{ mb: 4, animation: `${fadeInUp} 0.4s ease 0.13s both` }}>
                        {(Array.isArray(categories) ? categories : []).map((c) => (
                            <Chip key={c} label={c} size="small" sx={{
                                bgcolor: `${ACCENT}15`, color: ACCENT,
                                fontSize: '0.72rem', fontWeight: 500,
                            }} />
                        ))}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center"
                        sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={SOUNDBOARD_INVITE} target="_blank" rel="noopener" size="large"
                            startIcon={<AddIcon />}
                            sx={{
                                background: `linear-gradient(135deg, #5b8def, ${ACCENT})`, color: '#fff',
                                px: 4, py: 1.4, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: `0 8px 32px ${ACCENT}30`,
                                '&:hover': { boxShadow: `0 12px 40px ${ACCENT}40` },
                            }}>
                            {t('soundboardBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" rel="noopener" size="large"
                            startIcon={<OpenInNewIcon />}
                            sx={{
                                borderColor: `${ACCENT}40`, px: 4, py: 1.4, fontSize: '0.95rem',
                                '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` },
                            }}>
                            {t('soundboardBot.webDashboard')}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* ── Discord Preview ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                            <Chip label="Discord" size="small" sx={{ mb: 2, bgcolor: 'rgba(88,101,242,0.1)', color: '#5865F2' }} />
                            <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                                {t('soundboardBot.discordTitle')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                                {t('soundboardBot.discordText')}
                            </Typography>
                            <Stack spacing={1}>
                                {[
                                    t('soundboardBot.discordFeature1'),
                                    t('soundboardBot.discordFeature2'),
                                    t('soundboardBot.discordFeature3'),
                                    t('soundboardBot.discordFeature4'),
                                ].map((f, i) => (
                                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT, flexShrink: 0 }} />
                                        <Typography variant="body2" color="text.secondary">{f}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                        {/* Discord Screenshot Placeholder */}
                        <Box sx={{
                            width: { xs: '100%', md: 400 }, aspectRatio: '4/3', borderRadius: 3,
                            bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                            background: `linear-gradient(135deg, ${ACCENT}06 0%, rgba(91,141,239,0.03) 100%)`,
                        }}>
                            <ImageIcon sx={{ fontSize: 40, opacity: 0.1 }} />
                            <Typography variant="caption" color="text.disabled">Soundboard Panel</Typography>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ── Dashboard Showcase ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Stack direction={{ xs: 'column', md: 'row-reverse' }} spacing={6} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                            <Chip label="Web Dashboard" size="small" sx={{ mb: 2, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                            <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                                {t('soundboardBot.dashboardTitle')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                                {t('soundboardBot.dashboardText')}
                            </Typography>
                            <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" rel="noopener"
                                endIcon={<ArrowForwardIcon />}
                                sx={{
                                    borderColor: `${ACCENT}40`, px: 3,
                                    '&:hover': { borderColor: ACCENT, bgcolor: `${ACCENT}08` },
                                }}>
                                soundboard.bytebots.de
                            </Button>
                        </Box>
                        {/* Dashboard Screenshot Placeholder */}
                        <Box sx={{
                            width: { xs: '100%', md: 480 }, aspectRatio: '16/10', borderRadius: 4,
                            bgcolor: '#18181b', border: `1px solid ${ACCENT}12`, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                            background: `linear-gradient(135deg, ${ACCENT}06 0%, rgba(91,141,239,0.03) 100%)`,
                        }}>
                            <ImageIcon sx={{ fontSize: 40, opacity: 0.1 }} />
                            <Typography variant="caption" color="text.disabled">Web Dashboard</Typography>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ── Features Grid ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('soundboardBot.featuresLabel')} size="small" sx={{ mb: 2, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('soundboardBot.featuresTitle')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3, borderRadius: 3, bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s', '&:hover': { borderColor: `${ACCENT}25`, transform: 'translateY(-2px)' },
                            }}>
                                <Box sx={{ color: ACCENT, mb: 1.5, opacity: 0.7, '& svg': { fontSize: 22 } }}>{f.icon}</Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{f.title}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Gallery ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('soundboardBot.screenshotsLabel')} size="small" sx={{ mb: 2, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('soundboardBot.screenshotsTitle')}
                        </Typography>
                    </Box>

                    {/* Video Placeholder */}
                    <Box sx={{
                        aspectRatio: '16/9', borderRadius: 4, bgcolor: '#18181b', mb: 2.5,
                        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                        background: `linear-gradient(135deg, ${ACCENT}06 0%, rgba(91,141,239,0.03) 100%)`,
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { borderColor: `${ACCENT}25` },
                    }}>
                        <PlayCircleIcon sx={{ fontSize: 64, color: ACCENT, opacity: 0.2 }} />
                        <Typography variant="caption" color="text.disabled">Video — EarTastic in Action</Typography>
                    </Box>

                    {/* Screenshot Grid */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {(Array.isArray(t('soundboardBot.screenshots')) ? t('soundboardBot.screenshots') : []).map((label, i) => (
                            <Box key={i} sx={{
                                aspectRatio: '16/10', borderRadius: 3, bgcolor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: 0.75,
                                transition: 'all 0.2s', '&:hover': { borderColor: `${ACCENT}25` },
                            }}>
                                <ImageIcon sx={{ fontSize: 28, opacity: 0.08 }} />
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Commands ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="md">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('soundboardBot.commandsLabel')} size="small" sx={{ mb: 2, bgcolor: `${ACCENT}15`, color: ACCENT }} />
                        <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('soundboardBot.commandsTitle').replace('{count}', commands.length)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{t('soundboardBot.commandsSubtitle')}</Typography>
                    </Box>
                    <CommandList commands={commands} accentColor={ACCENT} />
                </Container>
            </Box>

            {/* ── CTA ── */}
            <Box sx={{ py: 12, px: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, height: 400, borderRadius: '50%', opacity: 0.06,
                    background: `radial-gradient(circle, ${ACCENT} 0%, transparent 60%)`,
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="sm" sx={{ position: 'relative' }}>
                    <Avatar src={AVATAR} sx={{ width: 56, height: 56, borderRadius: 2.5, mx: 'auto', mb: 3 }} />
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                        {t('soundboardBot.ctaTitle')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        {t('soundboardBot.ctaSubtitle')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                        <Button variant="contained" href={SOUNDBOARD_INVITE} target="_blank" rel="noopener" size="large"
                            startIcon={<AddIcon />}
                            sx={{
                                background: `linear-gradient(135deg, #5b8def, ${ACCENT})`, color: '#fff',
                                px: 4, py: 1.4, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: `0 8px 32px ${ACCENT}30`,
                            }}>
                            {t('soundboardBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" rel="noopener" size="large"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa', px: 4, py: 1.4,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' },
                            }}>
                            {t('soundboardBot.webDashboard')}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

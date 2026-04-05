import {
    Box, Typography, Container, Stack, Button, Card, CardContent,
    Chip, Avatar, keyframes,
} from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import StarIcon from '@mui/icons-material/Star';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CategoryIcon from '@mui/icons-material/Category';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import CommandList from '../components/CommandList';
import { SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

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

    const screenshots = t('soundboardBot.screenshots');

    return (
        <Box>
            <Box sx={{ pt: 12, pb: 8, px: 3, textAlign: 'center' }}>
                <Container maxWidth="md">
                    <Avatar
                        src="https://cdn.discordapp.com/avatars/1488966705488330932/96e1cfe3af1b12407f702d356d916038.png?size=128"
                        sx={{
                            width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 3,
                            boxShadow: '0 12px 32px rgba(168,85,247,0.3)',
                            animation: `${fadeInUp} 0.4s ease`,
                        }}
                    />
                    <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5, animation: `${fadeInUp} 0.4s ease 0.05s both` }}>
                        {t('soundboardBot.title')}
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7, animation: `${fadeInUp} 0.4s ease 0.1s both` }}>
                        {t('soundboardBot.subtitle')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={SOUNDBOARD_INVITE} target="_blank" startIcon={<AddIcon />}
                            sx={{ background: 'linear-gradient(135deg, #5b8def, #38bdf8)', color: '#fff', borderRadius: 3, px: 3,
                                boxShadow: '0 6px 24px rgba(168,85,247,0.3)', '&:hover': { boxShadow: '0 8px 32px rgba(168,85,247,0.4)' } }}>
                            {t('soundboardBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            {t('soundboardBot.webDashboard')}
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 5, px: 3 }}>
                <Container maxWidth="md">
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
                        {(Array.isArray(categories) ? categories : []).map((c) => (
                            <Chip key={c} label={c} size="small" sx={{ bgcolor: 'rgba(168,85,247,0.08)', color: 'primary.light', fontSize: '0.7rem' }} />
                        ))}
                    </Stack>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label={t('soundboardBot.featuresLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('soundboardBot.featuresTitle')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3, borderRadius: 4, bgcolor: '#18181b', border: '1px solid rgba(168,85,247,0.06)',
                                transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(168,85,247,0.15)', transform: 'translateY(-2px)' },
                            }}>
                                <Box sx={{ color: 'primary.light', mb: 1.5, opacity: 0.7, '& svg': { fontSize: 22 } }}>{f.icon}</Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{f.title}</Typography>
                                <Typography variant="caption" color="text.secondary">{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label={t('soundboardBot.screenshotsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('soundboardBot.screenshotsTitle')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {screenshots.map((l, i) => (
                            <Box key={i} sx={{
                                aspectRatio: '16/9', borderRadius: 4, bgcolor: '#18181b',
                                border: '1px solid rgba(168,85,247,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Stack alignItems="center" spacing={0.5}>
                                    <SearchIcon sx={{ fontSize: 28, opacity: 0.12 }} />
                                    <Typography variant="caption" color="text.disabled">{l}</Typography>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Chip label={t('soundboardBot.commandsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('soundboardBot.commandsTitle').replace('{count}', commands.length)}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>{t('soundboardBot.commandsSubtitle')}</Typography>
                    <CommandList commands={commands} accentColor="#5b8def" />
                </Container>
            </Box>
        </Box>
    );
}

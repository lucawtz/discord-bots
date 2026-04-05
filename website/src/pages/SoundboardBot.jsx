import {
    Box, Typography, Container, Stack, Button, Card, CardContent,
    Chip, keyframes,
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

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const features = [
    { icon: <LibraryMusicIcon />, title: 'Sound Library', text: 'Vordefinierte Sounds in 10 Kategorien.' },
    { icon: <CloudUploadIcon />, title: 'Custom Uploads', text: 'Eigene Sounds hochladen (MP3, WAV, OGG, WebM).' },
    { icon: <StarIcon />, title: 'Favoriten', text: 'Lieblingssounds markieren fuer schnellen Zugriff.' },
    { icon: <DashboardIcon />, title: 'Web Dashboard', text: 'Sounds ueber den Browser verwalten und hochladen.' },
    { icon: <CategoryIcon />, title: '10 Kategorien', text: 'Memes, Musik, Effekte, Tiere, Spiele und mehr.' },
    { icon: <TuneIcon />, title: 'Persoenliche Lautstaerke', text: 'Eigene Lautstaerke pro User (0-200%).' },
];

const commands = [
    { name: '/sound <name>', description: 'Sound suchen und abspielen. Autocomplete fuer Namen.' },
    { name: '/favorite <name>', description: 'Sound als Favorit markieren oder entfernen.' },
    { name: '/soundboard', description: 'Interaktives Soundboard-Panel mit Buttons und Menues.' },
    { name: '/dashboard', description: 'Web-Dashboard zum Verwalten und Hochladen von Sounds.' },
    { name: '/volume <prozent>', description: 'Persoenliche Lautstaerke setzen (0-200%).' },
];

const categories = [
    'Allgemein', 'Memes', 'Musik', 'Soundeffekte', 'Sprache',
    'Tiere', 'Spiele', 'Filme & Serien', 'Alerts', 'Ambient',
];

export default function SoundboardBot() {
    return (
        <Box>
            {/* Hero */}
            <Box sx={{ pt: 10, pb: 8, px: 3 }}>
                <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                    <Box sx={{
                        width: 72, height: 72, borderRadius: 2.5, mx: 'auto', mb: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(240,160,238,0.06)', border: '1px solid rgba(240,160,238,0.12)',
                        animation: `${fadeInUp} 0.4s ease`,
                    }}>
                        <GraphicEqIcon sx={{ fontSize: 36, color: 'secondary.main' }} />
                    </Box>
                    <Typography variant="h2" sx={{
                        fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, mb: 1.5,
                        animation: `${fadeInUp} 0.4s ease 0.05s both`,
                    }}>
                        Soundboard Bot
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{
                        maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7,
                        animation: `${fadeInUp} 0.4s ease 0.1s both`,
                    }}>
                        Interaktives Discord Soundboard mit Custom Uploads,
                        Favoriten, Web-Dashboard und 10 Sound-Kategorien.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button
                            variant="contained"
                            href={SOUNDBOARD_INVITE} target="_blank" rel="noopener noreferrer"
                            startIcon={<AddIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #f0a0ee, #e060d0)',
                                color: '#0a0a0f', px: 3,
                                '&:hover': { boxShadow: '0 4px 20px rgba(240,160,238,0.2)' },
                            }}
                        >
                            Bot einladen
                        </Button>
                        <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                            sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary', px: 3,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.02)' } }}
                        >
                            Web Dashboard
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Categories */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 5, px: 3 }}>
                <Container maxWidth="md">
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
                        {categories.map((cat) => (
                            <Chip key={cat} label={cat} size="small" variant="outlined"
                                sx={{ borderColor: 'rgba(255,255,255,0.08)', color: 'text.secondary' }}
                            />
                        ))}
                    </Stack>
                </Container>
            </Box>

            {/* Features */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Features</Typography>
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        Alles fuer dein Soundboard
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 2,
                    }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.08)' },
                            }}>
                                <Box sx={{ color: 'secondary.main', mb: 1.5, opacity: 0.7, '& svg': { fontSize: 24 } }}>{f.icon}</Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{f.title}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Screenshots */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Screenshots</Typography>
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>So sieht es aus</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {['Soundboard Panel', 'Web Dashboard', 'Sound Upload', 'Favoriten'].map((label, i) => (
                            <Box key={i} sx={{
                                aspectRatio: '16/9', borderRadius: 2,
                                bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Stack alignItems="center" spacing={0.5}>
                                    <SearchIcon sx={{ fontSize: 32, opacity: 0.15 }} />
                                    <Typography variant="caption" color="text.disabled">{label}</Typography>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Video */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Tutorial</Typography>
                    <Typography variant="h4" sx={{ mb: 4, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>Erklaervideo</Typography>
                    <Box sx={{
                        position: 'relative', width: '100%', pb: '56.25%', borderRadius: 2, overflow: 'hidden',
                        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                    }}>
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <PlayCircleOutlineIcon sx={{ fontSize: 48, opacity: 0.15 }} />
                            <Typography variant="caption" color="text.disabled">Video Platzhalter</Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* Commands */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Befehle</Typography>
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        {commands.length} Commands
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
                        Slash-Commands fuer jeden Text-Channel.
                    </Typography>
                    <CommandList commands={commands} accentColor="#f0a0ee" />
                </Container>
            </Box>
        </Box>
    );
}

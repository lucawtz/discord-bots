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
    { icon: <CloudUploadIcon />, title: 'Custom Uploads', text: 'Eigene Sounds hochladen.' },
    { icon: <StarIcon />, title: 'Favoriten', text: 'Schnellzugriff auf Lieblingssounds.' },
    { icon: <DashboardIcon />, title: 'Web Dashboard', text: 'Sounds ueber den Browser verwalten.' },
    { icon: <CategoryIcon />, title: '10 Kategorien', text: 'Memes, Musik, Effekte und mehr.' },
    { icon: <TuneIcon />, title: 'Persoenliche Volume', text: 'Eigene Lautstaerke pro User.' },
];

const commands = [
    { name: '/sound <name>', description: 'Sound suchen und abspielen.' },
    { name: '/favorite <name>', description: 'Sound als Favorit markieren.' },
    { name: '/soundboard', description: 'Interaktives Soundboard-Panel.' },
    { name: '/dashboard', description: 'Web-Dashboard oeffnen.' },
    { name: '/volume <prozent>', description: 'Persoenliche Lautstaerke setzen.' },
];

const categories = ['Allgemein', 'Memes', 'Musik', 'Soundeffekte', 'Sprache', 'Tiere', 'Spiele', 'Filme & Serien', 'Alerts', 'Ambient'];

export default function SoundboardBot() {
    return (
        <Box>
            <Box sx={{ pt: 12, pb: 8, px: 3, textAlign: 'center' }}>
                <Container maxWidth="md">
                    <Box sx={{
                        width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        color: '#fff', boxShadow: '0 12px 32px rgba(168,85,247,0.3)',
                        animation: `${fadeInUp} 0.4s ease`,
                    }}>
                        <GraphicEqIcon sx={{ fontSize: 36 }} />
                    </Box>
                    <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5, animation: `${fadeInUp} 0.4s ease 0.05s both` }}>
                        EarTastic
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7, animation: `${fadeInUp} 0.4s ease 0.1s both` }}>
                        Interaktives Discord Soundboard mit Custom Uploads, Favoriten,
                        Web-Dashboard und 10 Sound-Kategorien.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={SOUNDBOARD_INVITE} target="_blank" startIcon={<AddIcon />}
                            sx={{ background: 'linear-gradient(135deg, #5b8def, #38bdf8)', color: '#fff', borderRadius: 3, px: 3,
                                boxShadow: '0 6px 24px rgba(168,85,247,0.3)', '&:hover': { boxShadow: '0 8px 32px rgba(168,85,247,0.4)' } }}>
                            Add to Server
                        </Button>
                        <Button variant="outlined" href="https://soundboard.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            Web Dashboard
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 5, px: 3 }}>
                <Container maxWidth="md">
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
                        {categories.map((c) => (
                            <Chip key={c} label={c} size="small" sx={{ bgcolor: 'rgba(168,85,247,0.08)', color: 'primary.light', fontSize: '0.7rem' }} />
                        ))}
                    </Stack>
                </Container>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label="Features" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>Alles fuer dein Soundboard</Typography>
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
                    <Chip label="Screenshots" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>So sieht es aus</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {['Soundboard Panel', 'Web Dashboard', 'Sound Upload', 'Favoriten'].map((l, i) => (
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
                    <Chip label="Commands" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{commands.length} Commands</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>Slash-Commands fuer jeden Text-Channel.</Typography>
                    <CommandList commands={commands} accentColor="#5b8def" />
                </Container>
            </Box>
        </Box>
    );
}

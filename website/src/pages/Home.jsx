import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, CardContent,
    Chip, Stack, Container, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import WebIcon from '@mui/icons-material/Web';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const bots = [
    {
        id: 'music-bot',
        name: 'BeatByte',
        subtitle: 'Music Bot',
        description: 'YouTube-Streaming mit Queue, Playlists, Auto-DJ und einem Web Player im Spotify-Style. Auch als Desktop App verfuegbar.',
        icon: <MusicNoteIcon sx={{ fontSize: 28 }} />,
        color: '#08fcfe',
        tags: ['YouTube', 'Web Player', 'Desktop App', 'Playlists'],
        commands: 16,
        path: '/bots/music-bot',
        inviteUrl: BEATBYTE_INVITE,
    },
    {
        id: 'soundboard-bot',
        name: 'Soundboard',
        subtitle: 'Sound Effects Bot',
        description: 'Custom Sounds, Memes und Effekte per Knopfdruck. Mit Web-Dashboard, Sound-Upload und 10 Kategorien.',
        icon: <GraphicEqIcon sx={{ fontSize: 28 }} />,
        color: '#f0a0ee',
        tags: ['Custom Sounds', 'Web Dashboard', '10 Kategorien'],
        commands: 5,
        path: '/bots/soundboard-bot',
        inviteUrl: SOUNDBOARD_INVITE,
    },
];

const features = [
    { icon: <WebIcon />, title: 'Web Apps', text: 'Steuere deine Bots ueber den Browser. Kein Download noetig.' },
    { icon: <DesktopWindowsIcon />, title: 'Desktop Apps', text: 'Native Apps fuer Windows und Mac mit Tauri.' },
    { icon: <SecurityIcon />, title: 'Self-Hosted', text: 'Deine Daten auf deinen Servern. Volle Kontrolle.' },
    { icon: <SpeedIcon />, title: '24/7 Online', text: 'Automatischer Neustart, minimale Latenz, maximale Uptime.' },
];

const useCases = [
    { icon: <HeadphonesIcon />, title: 'Gaming Sessions', text: 'Hintergrundmusik und Soundeffekte waehrend dem Spielen.' },
    { icon: <DashboardIcon />, title: 'Community Server', text: 'Musik und Sounds fuer Events, Hangouts und mehr.' },
    { icon: <TuneIcon />, title: 'Streaming', text: 'Professionelle Audio-Steuerung fuer Content Creator.' },
    { icon: <AutoAwesomeIcon />, title: 'Eigene Projekte', text: 'Open Source und anpassbar. Baue darauf auf.' },
];

export default function Home() {
    return (
        <Box>
            {/* Hero */}
            <Box sx={{
                minHeight: '85vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', px: 3, pt: 6,
                position: 'relative',
            }}>
                <Container maxWidth="md">
                    <Typography
                        variant="overline"
                        sx={{
                            color: 'text.disabled', letterSpacing: 4, mb: 3, display: 'block',
                            animation: `${fadeInUp} 0.5s ease`,
                        }}
                    >
                        Discord Bot Platform
                    </Typography>
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                            fontWeight: 800, lineHeight: 1.1, mb: 3,
                            animation: `${fadeInUp} 0.5s ease 0.05s both`,
                        }}
                    >
                        Professionelle Bots{' '}
                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                            fuer{' '}
                            <Box component="span" sx={{
                                background: 'linear-gradient(135deg, #08fcfe 0%, #b48afe 50%, #f0a0ee 100%)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                deinen Server.
                            </Box>
                        </Box>
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: 'text.secondary', fontWeight: 400, maxWidth: 520, mx: 'auto', mb: 5,
                            fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.7,
                            animation: `${fadeInUp} 0.5s ease 0.1s both`,
                        }}
                    >
                        Musik, Soundboard und mehr. Mit Web Apps, Desktop Apps
                        und einer API. Kostenlos und self-hosted.
                    </Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} spacing={2}
                        justifyContent="center"
                        sx={{ animation: `${fadeInUp} 0.5s ease 0.15s both` }}
                    >
                        <Button
                            variant="contained" size="large"
                            component={Link} to="/bots/music-bot"
                            sx={{
                                background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                                color: '#0a0a0f', px: 4, py: 1.5, fontSize: '0.95rem',
                                '&:hover': { boxShadow: '0 4px 24px rgba(8,252,254,0.25)', transform: 'translateY(-1px)' },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Jetzt starten
                        </Button>
                        <Button
                            variant="outlined" size="large"
                            href="#bots"
                            onClick={(e) => { e.preventDefault(); document.getElementById('bots')?.scrollIntoView({ behavior: 'smooth' }); }}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.12)', color: 'text.primary', px: 4, py: 1.5,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.03)' },
                            }}
                        >
                            Bots ansehen
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Features Strip */}
            <Box sx={{ borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: 6, px: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: { xs: 3, md: 4 },
                    }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{ textAlign: 'center' }}>
                                <Box sx={{
                                    color: 'primary.main', mb: 1.5, opacity: 0.8,
                                    '& svg': { fontSize: 28 },
                                }}>
                                    {f.icon}
                                </Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                    {f.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                    {f.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Bots Section */}
            <Box id="bots" sx={{ py: 12, px: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ maxWidth: 560, mb: 8 }}>
                        <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 3, mb: 1.5, display: 'block' }}>
                            Bots
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5, fontWeight: 700 }}>
                            Waehle deinen Bot
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                            Jeder Bot ist ein eigenstaendiges Produkt mit eigener Web App
                            und vollem Feature-Set. Mehr Bots kommen bald.
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                        gap: 3,
                    }}>
                        {bots.map((bot, i) => (
                            <Card
                                key={bot.id}
                                sx={{
                                    bgcolor: 'background.paper',
                                    transition: 'all 0.25s ease',
                                    animation: `${fadeInUp} 0.4s ease ${i * 0.08}s both`,
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        borderColor: `${bot.color}30`,
                                        boxShadow: `0 8px 30px ${bot.color}10`,
                                    },
                                }}
                            >
                                <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
                                        <Box sx={{
                                            width: 52, height: 52, borderRadius: 2,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            bgcolor: `${bot.color}10`, color: bot.color,
                                        }}>
                                            {bot.icon}
                                        </Box>
                                        <Chip label={`${bot.commands} Commands`} size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'text.secondary', fontSize: '0.75rem' }}
                                        />
                                    </Box>
                                    <Typography variant="h5" sx={{ mb: 0.25, fontWeight: 700 }}>{bot.name}</Typography>
                                    <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>{bot.subtitle}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.7 }}>
                                        {bot.description}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                                        {bot.tags.map((tag) => (
                                            <Chip key={tag} label={tag} size="small" variant="outlined"
                                                sx={{ borderColor: 'rgba(255,255,255,0.08)', color: 'text.secondary', fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Stack>
                                    <Stack direction="row" spacing={1.5}>
                                        <Button
                                            variant="contained" size="small"
                                            href={bot.inviteUrl} target="_blank" rel="noopener noreferrer"
                                            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                                            sx={{
                                                bgcolor: bot.color, color: '#0a0a0f', fontWeight: 600, flex: 1,
                                                '&:hover': { bgcolor: bot.color, opacity: 0.9 },
                                            }}
                                        >
                                            Einladen
                                        </Button>
                                        <Button
                                            variant="outlined" size="small"
                                            component={Link} to={bot.path}
                                            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                                            sx={{
                                                borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary', flex: 1,
                                                '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.02)' },
                                            }}
                                        >
                                            Mehr erfahren
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Use Cases */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 12, px: 3 }}>
                <Container maxWidth="lg">
                    <Box sx={{ maxWidth: 560, mb: 8 }}>
                        <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 3, mb: 1.5, display: 'block' }}>
                            Use Cases
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1.5, fontWeight: 700 }}>
                            Gebaut fuer
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: 2.5,
                    }}>
                        {useCases.map((uc, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 3, borderRadius: 2,
                                    border: '1px solid', borderColor: 'divider',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { borderColor: 'rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.01)' },
                                }}
                            >
                                <Box sx={{ color: 'text.disabled', mb: 2, '& svg': { fontSize: 24 } }}>
                                    {uc.icon}
                                </Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 600 }}>
                                    {uc.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    {uc.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* CTA */}
            <Box sx={{ py: 12, px: 3, textAlign: 'center' }}>
                <Container maxWidth="sm">
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                        Bereit loszulegen?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
                        Lade einen Bot auf deinen Server ein und richte ihn in wenigen Minuten ein.
                    </Typography>
                    <Button
                        variant="contained" size="large"
                        component={Link} to="/bots/music-bot"
                        sx={{
                            background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                            color: '#0a0a0f', px: 5, py: 1.5, fontSize: '1rem',
                            '&:hover': { boxShadow: '0 4px 24px rgba(8,252,254,0.25)', transform: 'translateY(-1px)' },
                        }}
                    >
                        Jetzt starten
                    </Button>
                </Container>
            </Box>
        </Box>
    );
}

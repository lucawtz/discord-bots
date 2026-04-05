import {
    Box, Typography, Container, Stack, Button, Card, CardContent,
    Chip, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import RepeatIcon from '@mui/icons-material/Repeat';
import TuneIcon from '@mui/icons-material/Tune';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import WebIcon from '@mui/icons-material/Web';
import LyricsIcon from '@mui/icons-material/Lyrics';
import DownloadIcon from '@mui/icons-material/Download';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import AppleIcon from '@mui/icons-material/Apple';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import MusicPlayer from '../components/MusicPlayer';
import CommandList from '../components/CommandList';
import { BEATBYTE_INVITE } from '../config';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const features = [
    { icon: <PlayCircleOutlineIcon />, title: 'YouTube Streaming', text: 'Songs und Playlists direkt von YouTube. URL oder Suchbegriff.' },
    { icon: <QueueMusicIcon />, title: 'Queue Management', text: 'Hinzufuegen, entfernen, mischen, Drag & Drop Reihenfolge.' },
    { icon: <RepeatIcon />, title: 'Loop Modi', text: 'Song oder Queue wiederholen. Drei Modi: Aus, Song, Queue.' },
    { icon: <TuneIcon />, title: 'Lautstaerke & Seek', text: 'Lautstaerke 0-200% und an beliebige Stellen springen.' },
    { icon: <SaveIcon />, title: 'Playlists', text: 'Queue als Playlist speichern und jederzeit wieder laden.' },
    { icon: <AutoAwesomeIcon />, title: 'Auto-DJ', text: 'Automatische Vorschlaege wenn die Queue leer ist.' },
    { icon: <WebIcon />, title: 'Web Player', text: 'Spotify-aehnliches Interface im Browser mit Live-Updates.' },
    { icon: <LyricsIcon />, title: 'Lyrics', text: 'Songtexte direkt ueber Discord finden.' },
];

const commands = [
    { name: '/play <query>', description: 'Song oder Playlist abspielen. YouTube-URLs und Suchbegriffe.' },
    { name: '/playnow <query>', description: 'Alles ueberspringen und sofort abspielen.' },
    { name: '/skip', description: 'Aktuellen Song ueberspringen. Vote-Skip oder DJ-Rolle.' },
    { name: '/pause', description: 'Wiedergabe pausieren oder fortsetzen.' },
    { name: '/stop', description: 'Wiedergabe stoppen und Queue leeren.' },
    { name: '/queue', description: 'Aktuelle Warteschlange anzeigen.' },
    { name: '/nowplaying', description: 'Details zum aktuellen Song.' },
    { name: '/clear', description: 'Queue leeren, aktuellen Song behalten.' },
    { name: '/remove <pos>', description: 'Song nach Position entfernen.' },
    { name: '/shuffle', description: 'Warteschlange zufaellig mischen.' },
    { name: '/loop [modus]', description: 'Loop-Modus: off, song oder queue.' },
    { name: '/seek <zeit>', description: 'Zu bestimmter Zeit springen (z.B. 1:30).' },
    { name: '/volume [%]', description: 'Lautstaerke aendern (0-200%).' },
    { name: '/join', description: 'Voice Channel beitreten.' },
    { name: '/lyrics [query]', description: 'Songtexte suchen.' },
    { name: '/app', description: 'Web Player mit Zugangscode oeffnen.' },
];

export default function MusicBot() {
    return (
        <Box>
            {/* Hero */}
            <Box sx={{ pt: 10, pb: 8, px: 3 }}>
                <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                    <Box sx={{
                        width: 72, height: 72, borderRadius: 2.5, mx: 'auto', mb: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(8,252,254,0.06)', border: '1px solid rgba(8,252,254,0.12)',
                        animation: `${fadeInUp} 0.4s ease`,
                    }}>
                        <MusicNoteIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h2" sx={{
                        fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, mb: 1.5,
                        animation: `${fadeInUp} 0.4s ease 0.05s both`,
                    }}>
                        BeatByte
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{
                        maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7,
                        animation: `${fadeInUp} 0.4s ease 0.1s both`,
                    }}>
                        Discord Music Bot mit YouTube-Streaming, Queue-Management, Playlists,
                        Auto-DJ und einem Web Player im Spotify-Style.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button
                            variant="contained"
                            href={BEATBYTE_INVITE} target="_blank" rel="noopener noreferrer"
                            startIcon={<AddIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)',
                                color: '#0a0a0f', px: 3,
                                '&:hover': { boxShadow: '0 4px 20px rgba(8,252,254,0.2)' },
                            }}
                        >
                            Bot einladen
                        </Button>
                        <Button variant="outlined" href="https://app.bytebots.de" target="_blank" startIcon={<WebIcon />}
                            sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary', px: 3,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.02)' } }}
                        >
                            Web App
                        </Button>
                        <Button variant="outlined" href="#download" startIcon={<DownloadIcon />}
                            sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary', px: 3,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.02)' } }}
                        >
                            Desktop App
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Player Preview */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="sm">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block', textAlign: 'center' }}>
                        Preview
                    </Typography>
                    <Typography variant="h4" sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        Spotify-Style Player
                    </Typography>
                    <MusicPlayer />
                </Container>
            </Box>

            {/* Features */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Features</Typography>
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        Alles was du brauchst
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: 2,
                    }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.08)' },
                            }}>
                                <Box sx={{ color: 'primary.main', mb: 1.5, opacity: 0.7, '& svg': { fontSize: 24 } }}>{f.icon}</Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{f.title}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.text}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* Download */}
            <Box id="download" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Apps</Typography>
                    <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        Ueberall verfuegbar
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5, maxWidth: 440, lineHeight: 1.7 }}>
                        Nutze BeatByte im Browser oder als native Desktop App.
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                        <Card sx={{ flex: 1, '&:hover': { borderColor: 'rgba(8,252,254,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
                                <WebIcon sx={{ fontSize: 32, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Web App</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                                    Direkt im Browser. Kein Download noetig.
                                </Typography>
                                <Button variant="contained" fullWidth href="https://app.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                                    sx={{ background: 'linear-gradient(135deg, #08fcfe, #0ac2fe)', color: '#0a0a0f' }}>
                                    Oeffnen
                                </Button>
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1, '&:hover': { borderColor: 'rgba(180,138,254,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
                                <DesktopWindowsIcon sx={{ fontSize: 32, color: '#b48afe', mb: 2, opacity: 0.8 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Desktop App</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                                    Native App mit Tauri. Schnell und leichtgewichtig.
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" fullWidth startIcon={<DesktopWindowsIcon />}
                                        sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary',
                                            '&:hover': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                                        Windows
                                    </Button>
                                    <Button variant="outlined" fullWidth startIcon={<AppleIcon />}
                                        sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary',
                                            '&:hover': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                                        macOS
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>
            </Box>

            {/* Screenshots */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 3, mb: 1, display: 'block' }}>Screenshots</Typography>
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                        So sieht es aus
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {['Now Playing Embed', 'Queue Ansicht', 'Web Player', 'Desktop App'].map((label, i) => (
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
                        <Box sx={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        }}>
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
                    <CommandList commands={commands} accentColor="#08fcfe" />
                </Container>
            </Box>
        </Box>
    );
}

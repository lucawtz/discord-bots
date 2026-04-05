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
    { icon: <PlayCircleOutlineIcon />, title: 'YouTube Streaming', text: 'Songs und Playlists direkt von YouTube.' },
    { icon: <QueueMusicIcon />, title: 'Queue Management', text: 'Hinzufuegen, entfernen, mischen, Drag & Drop.' },
    { icon: <RepeatIcon />, title: 'Loop Modi', text: 'Song oder Queue wiederholen.' },
    { icon: <TuneIcon />, title: 'Volume & Seek', text: 'Lautstaerke 0-200%, beliebig springen.' },
    { icon: <SaveIcon />, title: 'Playlists', text: 'Queue speichern und laden.' },
    { icon: <AutoAwesomeIcon />, title: 'Auto-DJ', text: 'Automatische Vorschlaege.' },
    { icon: <WebIcon />, title: 'Web Player', text: 'Spotify-Style Interface im Browser.' },
    { icon: <LyricsIcon />, title: 'Lyrics', text: 'Songtexte direkt finden.' },
];

const commands = [
    { name: '/play <query>', description: 'Song oder Playlist abspielen.' },
    { name: '/playnow <query>', description: 'Sofort abspielen, Queue ueberspringen.' },
    { name: '/skip', description: 'Song ueberspringen.' },
    { name: '/pause', description: 'Pausieren / fortsetzen.' },
    { name: '/stop', description: 'Stoppen und Queue leeren.' },
    { name: '/queue', description: 'Warteschlange anzeigen.' },
    { name: '/nowplaying', description: 'Aktuellen Song anzeigen.' },
    { name: '/clear', description: 'Queue leeren.' },
    { name: '/remove <pos>', description: 'Song entfernen.' },
    { name: '/shuffle', description: 'Queue mischen.' },
    { name: '/loop [modus]', description: 'Loop: off / song / queue.' },
    { name: '/seek <zeit>', description: 'Zu Position springen.' },
    { name: '/volume [%]', description: 'Lautstaerke aendern.' },
    { name: '/join', description: 'Channel beitreten.' },
    { name: '/lyrics [query]', description: 'Lyrics suchen.' },
    { name: '/app', description: 'Web Player oeffnen.' },
];

export default function MusicBot() {
    return (
        <Box>
            {/* Hero */}
            <Box sx={{ pt: 12, pb: 8, px: 3, textAlign: 'center' }}>
                <Container maxWidth="md">
                    <Box sx={{
                        width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        color: '#fff', boxShadow: '0 12px 32px rgba(168,85,247,0.3)',
                        animation: `${fadeInUp} 0.4s ease`,
                    }}>
                        <MusicNoteIcon sx={{ fontSize: 36 }} />
                    </Box>
                    <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5, animation: `${fadeInUp} 0.4s ease 0.05s both` }}>
                        BeatByte
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7, animation: `${fadeInUp} 0.4s ease 0.1s both` }}>
                        Discord Music Bot mit YouTube-Streaming, Queue-Management, Playlists,
                        Auto-DJ und einem Web Player im Spotify-Style.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={BEATBYTE_INVITE} target="_blank" startIcon={<AddIcon />}
                            sx={{ background: 'linear-gradient(135deg, #a855f7, #a855f7)', color: '#fff', borderRadius: 3, px: 3,
                                boxShadow: '0 6px 24px rgba(168,85,247,0.3)', '&:hover': { boxShadow: '0 8px 32px rgba(168,85,247,0.4)' } }}>
                            Add to Server
                        </Button>
                        <Button variant="outlined" href="https://app.bytebots.de" target="_blank" startIcon={<WebIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            Web App
                        </Button>
                        <Button variant="outlined" href="#download" startIcon={<DownloadIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            Desktop App
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Player */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="sm">
                    <Chip label="Preview" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 4, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>Spotify-Style Player</Typography>
                    <MusicPlayer />
                </Container>
            </Box>

            {/* Features */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label="Features" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>Alles was du brauchst</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
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

            {/* Download */}
            <Box id="download" sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Chip label="Apps" size="small" sx={{ mb: 2, bgcolor: 'rgba(91,141,239,0.1)', color: 'secondary.light' }} />
                    <Typography variant="h4" sx={{ mb: 5, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>Ueberall verfuegbar</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', '&:hover': { borderColor: 'rgba(168,85,247,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <WebIcon sx={{ fontSize: 32, color: 'primary.light', mb: 2, opacity: 0.7 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>Web App</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Im Browser. Kein Download.</Typography>
                                <Button variant="contained" fullWidth href="https://app.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                                    sx={{ background: 'linear-gradient(135deg, #a855f7, #a855f7)', color: '#fff', borderRadius: 2.5 }}>
                                    Oeffnen
                                </Button>
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', '&:hover': { borderColor: 'rgba(91,141,239,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <DesktopWindowsIcon sx={{ fontSize: 32, color: 'secondary.light', mb: 2, opacity: 0.7 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>Desktop App</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Native App mit Tauri.</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" fullWidth startIcon={<DesktopWindowsIcon />}
                                        sx={{ borderColor: 'rgba(168,85,247,0.2)', borderRadius: 2.5, '&:hover': { borderColor: 'rgba(168,85,247,0.4)' } }}>
                                        Windows
                                    </Button>
                                    <Button variant="outlined" fullWidth startIcon={<AppleIcon />}
                                        sx={{ borderColor: 'rgba(168,85,247,0.2)', borderRadius: 2.5, '&:hover': { borderColor: 'rgba(168,85,247,0.4)' } }}>
                                        macOS
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>
            </Box>

            {/* Screenshots */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label="Screenshots" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>So sieht es aus</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {['Now Playing', 'Queue', 'Web Player', 'Desktop App'].map((l, i) => (
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

            {/* Commands */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Chip label="Commands" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{commands.length} Commands</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>Slash-Commands fuer jeden Text-Channel.</Typography>
                    <CommandList commands={commands} accentColor="#a855f7" />
                </Container>
            </Box>
        </Box>
    );
}

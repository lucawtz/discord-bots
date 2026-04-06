import {
    Box, Typography, Container, Stack, Button, Card, CardContent,
    Chip, Avatar, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import RepeatIcon from '@mui/icons-material/Repeat';
import TuneIcon from '@mui/icons-material/Tune';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
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
import { useLanguage } from '../i18n/LanguageContext';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

export default function MusicBot() {
    const { t } = useLanguage();

    const features = [
        { icon: <PlayCircleOutlineIcon />, title: t('musicBot.features.streaming'), text: t('musicBot.features.streamingText') },
        { icon: <QueueMusicIcon />, title: t('musicBot.features.queue'), text: t('musicBot.features.queueText') },
        { icon: <RepeatIcon />, title: t('musicBot.features.loop'), text: t('musicBot.features.loopText') },
        { icon: <TuneIcon />, title: t('musicBot.features.volume'), text: t('musicBot.features.volumeText') },
        { icon: <SaveIcon />, title: t('musicBot.features.playlists'), text: t('musicBot.features.playlistsText') },
        { icon: <AutoAwesomeIcon />, title: t('musicBot.features.autoDj'), text: t('musicBot.features.autoDjText') },
        { icon: <WebIcon />, title: t('musicBot.features.webPlayer'), text: t('musicBot.features.webPlayerText') },
        { icon: <LyricsIcon />, title: t('musicBot.features.lyrics'), text: t('musicBot.features.lyricsText') },
        { icon: <TuneIcon />, title: t('musicBot.features.filters'), text: t('musicBot.features.filtersText') },
    ];

    const commands = [
        { name: '/play <query>', description: t('musicBot.commands.play') },
        { name: '/playnow <query>', description: t('musicBot.commands.playnow') },
        { name: '/skip', description: t('musicBot.commands.skip') },
        { name: '/pause', description: t('musicBot.commands.pause') },
        { name: '/stop', description: t('musicBot.commands.stop') },
        { name: '/queue', description: t('musicBot.commands.queue') },
        { name: '/nowplaying', description: t('musicBot.commands.nowplaying') },
        { name: '/clear', description: t('musicBot.commands.clear') },
        { name: '/remove <pos>', description: t('musicBot.commands.remove') },
        { name: '/shuffle', description: t('musicBot.commands.shuffle') },
        { name: '/loop [modus]', description: t('musicBot.commands.loop') },
        { name: '/seek <zeit>', description: t('musicBot.commands.seek') },
        { name: '/volume [%]', description: t('musicBot.commands.volume') },
        { name: '/join', description: t('musicBot.commands.join') },
        { name: '/lyrics [query]', description: t('musicBot.commands.lyrics') },
        { name: '/app', description: t('musicBot.commands.app') },
        { name: '/autodj', description: t('musicBot.commands.autodj') },
        { name: '/disconnect', description: t('musicBot.commands.disconnect') },
        { name: '/filter <filter>', description: t('musicBot.commands.filter') },
        { name: '/move <von> <nach>', description: t('musicBot.commands.move') },
        { name: '/playlist <action>', description: t('musicBot.commands.playlist') },
        { name: '/replay', description: t('musicBot.commands.replay') },
        { name: '/setrole [rolle]', description: t('musicBot.commands.setrole') },
    ];

    return (
        <Box>
            {/* Hero */}
            <Box sx={{ pt: 12, pb: 8, px: 3, textAlign: 'center' }}>
                <Container maxWidth="md">
                    <Avatar
                        src="https://cdn.discordapp.com/avatars/1488919318472298647/f2829ad185e6a0fff4d7d064cdfdbb3e.png?size=128"
                        sx={{
                            width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 3,
                            boxShadow: '0 12px 32px rgba(168,85,247,0.3)',
                            animation: `${fadeInUp} 0.4s ease`,
                        }}
                    />
                    <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5, animation: `${fadeInUp} 0.4s ease 0.05s both` }}>
                        {t('musicBot.title')}
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 4, lineHeight: 1.7, animation: `${fadeInUp} 0.4s ease 0.1s both` }}>
                        {t('musicBot.subtitle')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={BEATBYTE_INVITE} target="_blank" startIcon={<AddIcon />}
                            sx={{ background: 'linear-gradient(135deg, #a855f7, #a855f7)', color: '#fff', borderRadius: 3, px: 3,
                                boxShadow: '0 6px 24px rgba(168,85,247,0.3)', '&:hover': { boxShadow: '0 8px 32px rgba(168,85,247,0.4)' } }}>
                            {t('musicBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://app.bytebots.de" target="_blank" startIcon={<WebIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            {t('musicBot.webApp')}
                        </Button>
                        <Button variant="outlined" href="#download" startIcon={<DownloadIcon />}
                            sx={{ borderColor: 'rgba(168,85,247,0.25)', borderRadius: 3, px: 3,
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' } }}>
                            {t('musicBot.desktopApp')}
                            <Chip label="Soon" size="small" sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: 'rgba(168,85,247,0.15)', color: '#c084fc' }} />
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Features */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="lg">
                    <Chip label={t('musicBot.featuresLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 6, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('musicBot.featuresTitle')}</Typography>
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
                    <Chip label={t('musicBot.appsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(91,141,239,0.1)', color: 'secondary.light' }} />
                    <Typography variant="h4" sx={{ mb: 5, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('musicBot.appsTitle')}</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', '&:hover': { borderColor: 'rgba(168,85,247,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <WebIcon sx={{ fontSize: 32, color: 'primary.light', mb: 2, opacity: 0.7 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>{t('musicBot.webAppCard')}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('musicBot.webAppDesc')}</Typography>
                                <Button variant="contained" fullWidth href="https://app.bytebots.de" target="_blank" startIcon={<OpenInNewIcon />}
                                    sx={{ background: 'linear-gradient(135deg, #a855f7, #a855f7)', color: '#fff', borderRadius: 2.5 }}>
                                    {t('musicBot.open')}
                                </Button>
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', opacity: 0.6, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center', position: 'relative' }}>
                                <Chip label={t('bots.comingSoon')} size="small" sx={{
                                    position: 'absolute', top: 16, right: 16,
                                    bgcolor: 'rgba(168,85,247,0.1)', color: '#a855f7', fontSize: '0.7rem',
                                }} />
                                <DesktopWindowsIcon sx={{ fontSize: 32, color: 'secondary.light', mb: 2, opacity: 0.7 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>{t('musicBot.desktopAppCard')}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('musicBot.desktopAppDesc')}</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" fullWidth disabled startIcon={<DesktopWindowsIcon />}
                                        sx={{ borderColor: 'rgba(168,85,247,0.1)', borderRadius: 2.5 }}>
                                        Windows
                                    </Button>
                                    <Button variant="outlined" fullWidth disabled startIcon={<AppleIcon />}
                                        sx={{ borderColor: 'rgba(168,85,247,0.1)', borderRadius: 2.5 }}>
                                        macOS
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>
            </Box>

            {/* Web Player Preview */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Chip label="Web Player" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 1.5, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('musicBot.screenshotsTitle')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        app.bytebots.de
                    </Typography>
                    <MusicPlayer />
                </Container>
            </Box>

            {/* Commands */}
            <Box sx={{ borderTop: '1px solid rgba(168,85,247,0.06)', py: 10, px: 3 }}>
                <Container maxWidth="md">
                    <Chip label={t('musicBot.commandsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                    <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' } }}>{t('musicBot.commandsTitle').replace('{count}', commands.length)}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>{t('musicBot.commandsSubtitle')}</Typography>
                    <CommandList commands={commands} accentColor="#a855f7" />
                </Container>
            </Box>
        </Box>
    );
}

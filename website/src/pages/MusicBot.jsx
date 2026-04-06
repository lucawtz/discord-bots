import {
    Box, Typography, Container, Stack, Button, Card, CardContent,
    Chip, Avatar, keyframes,
} from '@mui/material';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import RepeatIcon from '@mui/icons-material/Repeat';
import TuneIcon from '@mui/icons-material/Tune';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import WebIcon from '@mui/icons-material/Web';
import LyricsIcon from '@mui/icons-material/Lyrics';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import AppleIcon from '@mui/icons-material/Apple';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ImageIcon from '@mui/icons-material/Image';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import MusicPlayer from '../components/MusicPlayer';
import CommandList from '../components/CommandList';
import { BEATBYTE_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';

const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const AVATAR = 'https://cdn.discordapp.com/avatars/1488919318472298647/4764a9259454d44d47e75034c1f9c03b.png?size=128';

export default function MusicBot() {
    const { t } = useLanguage();

    const features = [
        { icon: <PlayCircleOutlineIcon />, title: t('musicBot.features.streaming'), text: t('musicBot.features.streamingText') },
        { icon: <QueueMusicIcon />, title: t('musicBot.features.queue'), text: t('musicBot.features.queueText') },
        { icon: <SaveIcon />, title: t('musicBot.features.playlists'), text: t('musicBot.features.playlistsText') },
        { icon: <AutoAwesomeIcon />, title: t('musicBot.features.autoDj'), text: t('musicBot.features.autoDjText') },
        { icon: <RepeatIcon />, title: t('musicBot.features.loop'), text: t('musicBot.features.loopText') },
        { icon: <TuneIcon />, title: t('musicBot.features.volume'), text: t('musicBot.features.volumeText') },
        { icon: <LyricsIcon />, title: t('musicBot.features.lyrics'), text: t('musicBot.features.lyricsText') },
        { icon: <TuneIcon />, title: t('musicBot.features.filters'), text: t('musicBot.features.filtersText') },
        { icon: <WebIcon />, title: t('musicBot.features.webPlayer'), text: t('musicBot.features.webPlayerText') },
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

    const platforms = ['YouTube', 'Spotify', 'Apple Music', 'Deezer', 'Amazon Music'];

    return (
        <Box>
            {/* ── Hero ── */}
            <Box sx={{ pt: 14, pb: 10, px: 3, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{
                    position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: 600, height: 600, borderRadius: '50%', opacity: 0.1,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
                    <Avatar src={AVATAR} sx={{
                        width: 88, height: 88, borderRadius: 3, mx: 'auto', mb: 3,
                        boxShadow: '0 16px 48px rgba(168,85,247,0.35)',
                        animation: `${fadeInUp} 0.4s ease`,
                    }} />
                    <Typography variant="h1" sx={{
                        fontSize: { xs: '2.25rem', md: '3.25rem' }, fontWeight: 800,
                        letterSpacing: '-0.02em', mb: 2,
                        animation: `${fadeInUp} 0.4s ease 0.05s both`,
                    }}>
                        {t('musicBot.title')}
                    </Typography>
                    <Typography color="text.secondary" sx={{
                        maxWidth: 520, mx: 'auto', mb: 3, lineHeight: 1.7, fontSize: '1.05rem',
                        animation: `${fadeInUp} 0.4s ease 0.1s both`,
                    }}>
                        {t('musicBot.subtitle')}
                    </Typography>

                    {/* Platform Pills */}
                    <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" useFlexGap
                        sx={{ mb: 4, animation: `${fadeInUp} 0.4s ease 0.13s both` }}>
                        {platforms.map((p) => (
                            <Chip key={p} label={p} size="small" sx={{
                                bgcolor: 'rgba(168,85,247,0.08)', color: '#c084fc',
                                fontSize: '0.72rem', fontWeight: 500,
                            }} />
                        ))}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center"
                        sx={{ animation: `${fadeInUp} 0.4s ease 0.15s both` }}>
                        <Button variant="contained" href={BEATBYTE_INVITE} target="_blank" rel="noopener" size="large"
                            startIcon={<AddIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                px: 4, py: 1.4, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: '0 8px 32px rgba(168,85,247,0.3)',
                                '&:hover': { boxShadow: '0 12px 40px rgba(168,85,247,0.4)' },
                            }}>
                            {t('musicBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://app.bytebots.de" target="_blank" rel="noopener" size="large"
                            startIcon={<WebIcon />}
                            sx={{
                                borderColor: 'rgba(168,85,247,0.25)', px: 4, py: 1.4, fontSize: '0.95rem',
                                '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' },
                            }}>
                            {t('musicBot.webApp')}
                        </Button>
                        <Button variant="outlined" href="#download" size="large"
                            startIcon={<DesktopWindowsIcon />}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.08)', color: '#71717a', px: 4, py: 1.4, fontSize: '0.95rem',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.15)', color: '#a1a1aa' },
                            }}>
                            {t('musicBot.desktopApp')}
                            <Chip label="Soon" size="small" sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: 'rgba(168,85,247,0.15)', color: '#c084fc' }} />
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
                                {t('musicBot.discordPreviewTitle')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                                {t('musicBot.discordPreviewText')}
                            </Typography>
                            <Stack spacing={1}>
                                {[
                                    t('musicBot.discordFeature1'),
                                    t('musicBot.discordFeature2'),
                                    t('musicBot.discordFeature3'),
                                    t('musicBot.discordFeature4'),
                                ].map((f, i) => (
                                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#a855f7', flexShrink: 0 }} />
                                        <Typography variant="body2" color="text.secondary">{f}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                        <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
                            <MusicPlayer />
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ── Web App Showcase ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Stack direction={{ xs: 'column', md: 'row-reverse' }} spacing={6} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                            <Chip label="Web App" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                            <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                                {t('musicBot.webAppShowcaseTitle')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                                {t('musicBot.webAppShowcaseText')}
                            </Typography>
                            <Button variant="outlined" href="https://app.bytebots.de" target="_blank" rel="noopener"
                                endIcon={<ArrowForwardIcon />}
                                sx={{
                                    borderColor: 'rgba(168,85,247,0.25)', px: 3,
                                    '&:hover': { borderColor: 'rgba(168,85,247,0.5)', bgcolor: 'rgba(168,85,247,0.04)' },
                                }}>
                                app.bytebots.de
                            </Button>
                        </Box>
                        {/* Web App Screenshot Placeholder */}
                        <Box sx={{
                            width: { xs: '100%', md: 480 }, aspectRatio: '16/10', borderRadius: 4,
                            bgcolor: '#18181b', border: '1px solid rgba(168,85,247,0.08)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(56,189,248,0.02) 100%)',
                        }}>
                            <ImageIcon sx={{ fontSize: 40, opacity: 0.1 }} />
                            <Typography variant="caption" color="text.disabled">Web Player Screenshot</Typography>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ── Features Grid ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('musicBot.featuresLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('musicBot.featuresTitle')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        {features.map((f, i) => (
                            <Box key={i} sx={{
                                p: 3, borderRadius: 3, bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(168,85,247,0.15)', transform: 'translateY(-2px)' },
                            }}>
                                <Box sx={{ color: 'primary.light', mb: 1.5, opacity: 0.7, '& svg': { fontSize: 22 } }}>{f.icon}</Box>
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
                        <Chip label={t('musicBot.screenshotsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('musicBot.screenshotsTitle')}
                        </Typography>
                    </Box>

                    {/* Video Placeholder */}
                    <Box sx={{
                        aspectRatio: '16/9', borderRadius: 4, bgcolor: '#18181b', mb: 2.5,
                        border: '1px solid rgba(168,85,247,0.06)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.04) 0%, rgba(56,189,248,0.02) 100%)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { borderColor: 'rgba(168,85,247,0.15)' },
                    }}>
                        <PlayCircleIcon sx={{ fontSize: 64, color: '#a855f7', opacity: 0.2 }} />
                        <Typography variant="caption" color="text.disabled">{t('musicBot.videoPlaceholder')}</Typography>
                    </Box>

                    {/* Screenshot Grid */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        {[
                            'Now Playing Embed',
                            'Queue',
                            'Web Player',
                            'Playlist Import',
                            'Audio Filter',
                            'Auto-DJ',
                        ].map((label, i) => (
                            <Box key={i} sx={{
                                aspectRatio: '16/10', borderRadius: 3, bgcolor: '#18181b',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: 0.75,
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'rgba(168,85,247,0.15)' },
                            }}>
                                <ImageIcon sx={{ fontSize: 28, opacity: 0.08 }} />
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Apps ── */}
            <Box id="download" sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="md">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('musicBot.appsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(91,141,239,0.1)', color: 'secondary.light' }} />
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('musicBot.appsTitle')}
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.06)', '&:hover': { borderColor: 'rgba(168,85,247,0.15)' }, transition: 'all 0.2s' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <WebIcon sx={{ fontSize: 32, color: 'primary.light', mb: 2, opacity: 0.7 }} />
                                <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>{t('musicBot.webAppCard')}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('musicBot.webAppDesc')}</Typography>
                                <Button variant="contained" fullWidth href="https://app.bytebots.de" target="_blank" rel="noopener" startIcon={<OpenInNewIcon />}
                                    sx={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', borderRadius: 2.5 }}>
                                    {t('musicBot.open')}
                                </Button>
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1, bgcolor: '#18181b', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.5 }}>
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
                                        sx={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 2.5 }}>Windows</Button>
                                    <Button variant="outlined" fullWidth disabled startIcon={<AppleIcon />}
                                        sx={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 2.5 }}>macOS</Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Container>
            </Box>

            {/* ── Commands ── */}
            <Box sx={{ py: 10, px: 3, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Container maxWidth="md">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip label={t('musicBot.commandsLabel')} size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                        <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 700 }}>
                            {t('musicBot.commandsTitle').replace('{count}', commands.length)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{t('musicBot.commandsSubtitle')}</Typography>
                    </Box>
                    <CommandList commands={commands} accentColor="#a855f7" />
                </Container>
            </Box>

            {/* ── CTA ── */}
            <Box sx={{ py: 12, px: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, height: 400, borderRadius: '50%', opacity: 0.06,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 60%)',
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />
                <Container maxWidth="sm" sx={{ position: 'relative' }}>
                    <Avatar src={AVATAR} sx={{ width: 56, height: 56, borderRadius: 2.5, mx: 'auto', mb: 3 }} />
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                        {t('musicBot.ctaTitle')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        {t('musicBot.ctaSubtitle')}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                        <Button variant="contained" href={BEATBYTE_INVITE} target="_blank" rel="noopener" size="large"
                            startIcon={<AddIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                                px: 4, py: 1.4, fontSize: '0.95rem', fontWeight: 600,
                                boxShadow: '0 8px 32px rgba(168,85,247,0.3)',
                            }}>
                            {t('musicBot.addToServer')}
                        </Button>
                        <Button variant="outlined" href="https://app.bytebots.de" target="_blank" rel="noopener" size="large"
                            sx={{
                                borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa', px: 4, py: 1.4,
                                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', color: '#fafafa' },
                            }}>
                            {t('musicBot.webApp')}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

import { useState } from 'react';
import {
    Box, Typography, Container, Stack, Chip, List, ListItemButton,
    ListItemText, ListItemIcon, Drawer, IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import HelpIcon from '@mui/icons-material/Help';
import MenuIcon from '@mui/icons-material/Menu';
import { useLanguage } from '../i18n/LanguageContext';

function ContentRenderer({ items }) {
    return (
        <Stack spacing={2}>
            {items.map((item, i) => {
                if (item.type === 'heading') {
                    return <Typography key={i} variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, mt: i > 0 ? 2 : 0 }}>{item.value}</Typography>;
                }
                if (item.type === 'command') {
                    return (
                        <Box key={i} sx={{
                            display: 'flex', gap: 2, p: 2, borderRadius: 3,
                            bgcolor: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.06)',
                            flexDirection: { xs: 'column', sm: 'row' },
                        }}>
                            <Typography sx={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem',
                                fontWeight: 600, color: 'primary.light', whiteSpace: 'nowrap', minWidth: 180,
                            }}>
                                {item.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                        </Box>
                    );
                }
                return <Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>{item.value}</Typography>;
            })}
        </Stack>
    );
}

export default function Guide() {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState('getting-started');
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const sections = [
        {
            id: 'getting-started',
            label: t('guide.gettingStarted'),
            icon: <MenuBookIcon sx={{ fontSize: 18 }} />,
            content: {
                title: t('guide.gettingStartedTitle'),
                body: [
                    { type: 'text', value: t('guide.gettingStartedIntro') },
                    { type: 'heading', value: t('guide.inviteBot') },
                    { type: 'text', value: t('guide.inviteBotText') },
                    { type: 'heading', value: t('guide.permissions') },
                    { type: 'text', value: t('guide.permissionsText') },
                    { type: 'heading', value: t('guide.getStarted') },
                    { type: 'text', value: t('guide.getStartedText') },
                ],
            },
        },
        {
            id: 'setup',
            label: t('guide.setupConfig'),
            icon: <SettingsIcon sx={{ fontSize: 18 }} />,
            content: {
                title: t('guide.setupConfigTitle'),
                body: [
                    { type: 'heading', value: t('guide.djRole') },
                    { type: 'text', value: t('guide.djRoleText') },
                    { type: 'heading', value: t('guide.webPlayerAccess') },
                    { type: 'text', value: t('guide.webPlayerAccessText') },
                    { type: 'heading', value: t('guide.soundboardDashboard') },
                    { type: 'text', value: t('guide.soundboardDashboardText') },
                ],
            },
        },
        {
            id: 'music-commands',
            label: t('guide.musicCommands'),
            icon: <MusicNoteIcon sx={{ fontSize: 18 }} />,
            content: {
                title: t('guide.musicCommandsTitle'),
                body: [
                    { type: 'text', value: t('guide.musicCommandsIntro') },
                    { type: 'command', name: '/play <query>', desc: t('commands.beatbyte.play') },
                    { type: 'command', name: '/playnow <query>', desc: t('commands.beatbyte.playnow') },
                    { type: 'command', name: '/skip', desc: t('commands.beatbyte.skip') },
                    { type: 'command', name: '/pause', desc: t('commands.beatbyte.pause') },
                    { type: 'command', name: '/stop', desc: t('commands.beatbyte.stop') },
                    { type: 'command', name: '/queue', desc: t('commands.beatbyte.queue') },
                    { type: 'command', name: '/shuffle', desc: t('commands.beatbyte.shuffle') },
                    { type: 'command', name: '/loop [modus]', desc: t('commands.beatbyte.loop') },
                    { type: 'command', name: '/volume [%]', desc: t('commands.beatbyte.volume') },
                    { type: 'command', name: '/seek <zeit>', desc: t('commands.beatbyte.seek') },
                    { type: 'command', name: '/app', desc: t('commands.beatbyte.app') },
                ],
            },
        },
        {
            id: 'soundboard-commands',
            label: t('guide.soundboardCommands'),
            icon: <GraphicEqIcon sx={{ fontSize: 18 }} />,
            content: {
                title: t('guide.soundboardCommandsTitle'),
                body: [
                    { type: 'text', value: t('guide.soundboardCommandsIntro') },
                    { type: 'command', name: '/sound <name>', desc: t('commands.eartastic.sound') },
                    { type: 'command', name: '/favorite <name>', desc: t('commands.eartastic.favorite') },
                    { type: 'command', name: '/soundboard', desc: t('commands.eartastic.soundboard') },
                    { type: 'command', name: '/dashboard', desc: t('commands.eartastic.dashboard') },
                    { type: 'command', name: '/volume <prozent>', desc: t('commands.eartastic.volume') },
                ],
            },
        },
        {
            id: 'troubleshooting',
            label: t('guide.troubleshooting'),
            icon: <HelpIcon sx={{ fontSize: 18 }} />,
            content: {
                title: t('guide.troubleshootingTitle'),
                body: [
                    { type: 'heading', value: t('guide.botNotResponding') },
                    { type: 'text', value: t('guide.botNotRespondingText') },
                    { type: 'heading', value: t('guide.noSound') },
                    { type: 'text', value: t('guide.noSoundText') },
                    { type: 'heading', value: t('guide.webPlayerNotConnecting') },
                    { type: 'text', value: t('guide.webPlayerNotConnectingText') },
                    { type: 'heading', value: t('guide.uploadFails') },
                    { type: 'text', value: t('guide.uploadFailsText') },
                ],
            },
        },
    ];

    const current = sections.find(s => s.id === activeSection);

    const sidebar = (
        <Box sx={{ width: 240, p: 2 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, px: 2, mb: 1, display: 'block' }}>
                Documentation
            </Typography>
            <List disablePadding>
                {sections.map((s) => (
                    <ListItemButton
                        key={s.id}
                        selected={activeSection === s.id}
                        onClick={() => { setActiveSection(s.id); setMobileOpen(false); }}
                        sx={{
                            borderRadius: 2, mb: 0.5, py: 1,
                            '&.Mui-selected': { bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' },
                            '&:hover': { bgcolor: 'rgba(168,85,247,0.06)' },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36, color: activeSection === s.id ? 'primary.light' : 'text.disabled' }}>
                            {s.icon}
                        </ListItemIcon>
                        <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: activeSection === s.id ? 600 : 400 }} />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ pt: 10, pb: 10, px: 3 }}>
            <Container maxWidth="lg">
                <Stack direction="row" spacing={4}>
                    {/* Desktop Sidebar */}
                    {!isMobile && (
                        <Box sx={{
                            position: 'sticky', top: 80, height: 'fit-content',
                            borderRight: '1px solid rgba(168,85,247,0.06)', pr: 2, flexShrink: 0,
                        }}>
                            {sidebar}
                        </Box>
                    )}

                    {/* Mobile menu button */}
                    {isMobile && (
                        <IconButton onClick={() => setMobileOpen(true)}
                            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100,
                                bgcolor: '#a855f7', color: '#fff', width: 48, height: 48,
                                boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
                                '&:hover': { bgcolor: '#6b4fe0' } }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}
                        PaperProps={{ sx: { bgcolor: '#0e1025', borderRight: '1px solid rgba(168,85,247,0.1)' } }}>
                        {sidebar}
                    </Drawer>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Chip label="Guide" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                        <Typography variant="h3" sx={{ mb: 4, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                            {current?.content.title}
                        </Typography>
                        {current && <ContentRenderer items={current.content.body} />}
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}

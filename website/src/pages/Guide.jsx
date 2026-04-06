import { useState } from 'react';
import {
    Box, Typography, Container, Stack, Chip, List, ListItemButton,
    ListItemText, ListItemIcon, Drawer, IconButton, useMediaQuery, useTheme,
    Avatar,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MenuIcon from '@mui/icons-material/Menu';
import { useLanguage } from '../i18n/LanguageContext';

function ContentRenderer({ items }) {
    return (
        <Stack spacing={2}>
            {items.map((item, i) => {
                if (item.type === 'heading') {
                    return <Typography key={i} variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, mt: i > 0 ? 2 : 0 }}>{item.value}</Typography>;
                }
                if (item.type === 'section') {
                    return (
                        <Typography key={i} variant="overline" sx={{
                            color: '#a855f7', letterSpacing: 3, fontSize: '0.65rem',
                            mt: i > 0 ? 4 : 1, display: 'block', pb: 1,
                            borderBottom: '1px solid rgba(168,85,247,0.1)',
                        }}>
                            {item.value}
                        </Typography>
                    );
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
                                fontWeight: 600, color: 'primary.light', whiteSpace: 'nowrap', minWidth: 200,
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

const BEATBYTE_AVATAR = 'https://cdn.discordapp.com/avatars/1488919318472298647/f2829ad185e6a0fff4d7d064cdfdbb3e.png?size=64';
const EARTASTIC_AVATAR = 'https://cdn.discordapp.com/avatars/1488966705488330932/96e1cfe3af1b12407f702d356d916038.png?size=64';

export default function Guide() {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState('getting-started');
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const navItems = [
        {
            id: 'getting-started',
            label: t('guide.gettingStarted'),
            icon: <MenuBookIcon sx={{ fontSize: 18 }} />,
        },
        {
            id: 'beatbyte',
            label: 'BeatByte',
            icon: <Avatar src={BEATBYTE_AVATAR} sx={{ width: 22, height: 22, borderRadius: 1 }} />,
        },
        {
            id: 'eartastic',
            label: 'EarTastic',
            icon: <Avatar src={EARTASTIC_AVATAR} sx={{ width: 22, height: 22, borderRadius: 1 }} />,
        },
    ];

    const sections = {
        'getting-started': {
            title: t('guide.gettingStartedTitle'),
            body: [
                { type: 'text', value: t('guide.gettingStartedIntro') },
                { type: 'heading', value: t('guide.inviteBot') },
                { type: 'text', value: t('guide.inviteBotText') },
                { type: 'heading', value: t('guide.permissions') },
                { type: 'text', value: t('guide.permissionsText') },
                { type: 'heading', value: t('guide.getStarted') },
                { type: 'text', value: t('guide.getStartedText') },

                { type: 'section', value: 'TROUBLESHOOTING' },
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
        'beatbyte': {
            title: 'BeatByte',
            body: [
                { type: 'section', value: 'SETUP' },
                { type: 'heading', value: t('guide.djRole') },
                { type: 'text', value: t('guide.djRoleText') },
                { type: 'heading', value: t('guide.webPlayerAccess') },
                { type: 'text', value: t('guide.webPlayerAccessText') },
                { type: 'heading', value: t('guide.autoDjHeading') },
                { type: 'text', value: t('guide.autoDjText') },
                { type: 'heading', value: t('guide.filtersHeading') },
                { type: 'text', value: t('guide.filtersText') },

                { type: 'section', value: `COMMANDS (23)` },
                { type: 'command', name: '/play <query>', desc: t('commands.beatbyte.play') },
                { type: 'command', name: '/playnow <query>', desc: t('commands.beatbyte.playnow') },
                { type: 'command', name: '/skip', desc: t('commands.beatbyte.skip') },
                { type: 'command', name: '/pause', desc: t('commands.beatbyte.pause') },
                { type: 'command', name: '/stop', desc: t('commands.beatbyte.stop') },
                { type: 'command', name: '/queue', desc: t('commands.beatbyte.queue') },
                { type: 'command', name: '/nowplaying', desc: t('commands.beatbyte.nowplaying') },
                { type: 'command', name: '/clear', desc: t('commands.beatbyte.clear') },
                { type: 'command', name: '/remove <pos>', desc: t('commands.beatbyte.remove') },
                { type: 'command', name: '/shuffle', desc: t('commands.beatbyte.shuffle') },
                { type: 'command', name: '/loop [modus]', desc: t('commands.beatbyte.loop') },
                { type: 'command', name: '/seek <zeit>', desc: t('commands.beatbyte.seek') },
                { type: 'command', name: '/volume [%]', desc: t('commands.beatbyte.volume') },
                { type: 'command', name: '/join', desc: t('commands.beatbyte.join') },
                { type: 'command', name: '/lyrics [query]', desc: t('commands.beatbyte.lyrics') },
                { type: 'command', name: '/app', desc: t('commands.beatbyte.app') },
                { type: 'command', name: '/autodj', desc: t('commands.beatbyte.autodj') },
                { type: 'command', name: '/disconnect', desc: t('commands.beatbyte.disconnect') },
                { type: 'command', name: '/filter <filter>', desc: t('commands.beatbyte.filter') },
                { type: 'command', name: '/move <von> <nach>', desc: t('commands.beatbyte.move') },
                { type: 'command', name: '/playlist <action>', desc: t('commands.beatbyte.playlist') },
                { type: 'command', name: '/replay', desc: t('commands.beatbyte.replay') },
                { type: 'command', name: '/setrole [rolle]', desc: t('commands.beatbyte.setrole') },
            ],
        },
        'eartastic': {
            title: 'EarTastic',
            body: [
                { type: 'section', value: 'SETUP' },
                { type: 'heading', value: t('guide.soundboardDashboard') },
                { type: 'text', value: t('guide.soundboardDashboardText') },
                { type: 'heading', value: t('guide.soundUploadHeading') },
                { type: 'text', value: t('guide.soundUploadText') },

                { type: 'section', value: 'COMMANDS (5)' },
                { type: 'command', name: '/sound <name>', desc: t('commands.eartastic.sound') },
                { type: 'command', name: '/favorite <name>', desc: t('commands.eartastic.favorite') },
                { type: 'command', name: '/soundboard', desc: t('commands.eartastic.soundboard') },
                { type: 'command', name: '/dashboard', desc: t('commands.eartastic.dashboard') },
                { type: 'command', name: '/volume <prozent>', desc: t('commands.eartastic.volume') },
            ],
        },
    };

    const current = sections[activeSection];

    const sidebar = (
        <Box sx={{ width: 220, p: 2 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, px: 2, mb: 1, display: 'block', fontSize: '0.65rem' }}>
                {t('footer.documentation', 'Documentation')}
            </Typography>
            <List disablePadding>
                {navItems.map((s) => (
                    <ListItemButton
                        key={s.id}
                        selected={activeSection === s.id}
                        onClick={() => { setActiveSection(s.id); setMobileOpen(false); }}
                        sx={{
                            borderRadius: 2, mb: 0.25, py: 0.8,
                            '&.Mui-selected': { bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' },
                            '&:hover': { bgcolor: 'rgba(168,85,247,0.06)' },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 34, color: activeSection === s.id ? 'primary.light' : 'text.disabled' }}>
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
                    {!isMobile && (
                        <Box sx={{
                            position: 'sticky', top: 80, height: 'fit-content',
                            borderRight: '1px solid rgba(168,85,247,0.06)', pr: 2, flexShrink: 0,
                        }}>
                            {sidebar}
                        </Box>
                    )}

                    {isMobile && (
                        <IconButton onClick={() => setMobileOpen(true)}
                            sx={{
                                position: 'fixed', bottom: 24, right: 24, zIndex: 100,
                                bgcolor: '#a855f7', color: '#fff', width: 48, height: 48,
                                boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
                                '&:hover': { bgcolor: '#6b4fe0' },
                            }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}
                        PaperProps={{ sx: { bgcolor: '#0e1025', borderRight: '1px solid rgba(168,85,247,0.1)' } }}>
                        {sidebar}
                    </Drawer>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Chip label="Guide" size="small" sx={{ mb: 2, bgcolor: 'rgba(168,85,247,0.1)', color: 'primary.light' }} />
                        <Typography variant="h3" sx={{ mb: 4, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                            {current?.title}
                        </Typography>
                        {current && <ContentRenderer items={current.body} />}
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}

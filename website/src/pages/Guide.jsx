import { useState } from 'react';
import {
    Box, Typography, Container, Stack, Chip, List, ListItemButton,
    ListItemText, ListItemIcon, Drawer, IconButton, useMediaQuery, useTheme,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import HelpIcon from '@mui/icons-material/Help';
import MenuIcon from '@mui/icons-material/Menu';

const sections = [
    {
        id: 'getting-started',
        label: 'Getting Started',
        icon: <MenuBookIcon sx={{ fontSize: 18 }} />,
        content: {
            title: 'Getting Started',
            body: [
                { type: 'text', value: 'Willkommen bei ByteBots! Hier erfaehrst du, wie du unsere Bots auf deinem Discord Server einrichtest.' },
                { type: 'heading', value: '1. Bot einladen' },
                { type: 'text', value: 'Klicke auf "Add to Server" auf der jeweiligen Bot-Seite. Du wirst zu Discord weitergeleitet, wo du den Server auswaehlen kannst.' },
                { type: 'heading', value: '2. Berechtigungen' },
                { type: 'text', value: 'Der Bot benoetigt Berechtigungen fuer Voice Channels (Verbinden, Sprechen) und Text Channels (Nachrichten senden, Slash Commands). Diese werden automatisch angefragt.' },
                { type: 'heading', value: '3. Loslegen' },
                { type: 'text', value: 'Nach dem Einladen kannst du sofort Slash Commands nutzen. Tippe / in einen Text Channel um alle verfuegbaren Commands zu sehen.' },
            ],
        },
    },
    {
        id: 'setup',
        label: 'Setup & Config',
        icon: <SettingsIcon sx={{ fontSize: 18 }} />,
        content: {
            title: 'Setup & Konfiguration',
            body: [
                { type: 'heading', value: 'DJ-Rolle (BeatByte)' },
                { type: 'text', value: 'Erstelle eine Rolle namens "DJ" auf deinem Server. User mit dieser Rolle koennen Songs direkt skippen, ohne Vote-Skip.' },
                { type: 'heading', value: 'Web Player Zugang' },
                { type: 'text', value: 'Nutze /app in Discord um einen Zugangscode fuer den Web Player zu erhalten. Der Code ist 7 Tage gueltig.' },
                { type: 'heading', value: 'Soundboard Dashboard' },
                { type: 'text', value: 'Nutze /dashboard um einen Link zum Web-Dashboard zu erhalten. Dort kannst du Sounds hochladen, organisieren und verwalten.' },
            ],
        },
    },
    {
        id: 'music-commands',
        label: 'Music Commands',
        icon: <MusicNoteIcon sx={{ fontSize: 18 }} />,
        content: {
            title: 'BeatByte Commands',
            body: [
                { type: 'text', value: 'BeatByte bietet 16 Slash Commands fuer volle Musiksteuerung:' },
                { type: 'command', name: '/play <query>', desc: 'Song oder Playlist abspielen. Unterstuetzt YouTube-URLs und Suchbegriffe.' },
                { type: 'command', name: '/playnow <query>', desc: 'Sofort abspielen, Queue ueberspringen.' },
                { type: 'command', name: '/skip', desc: 'Aktuellen Song ueberspringen (Vote-Skip oder DJ-Rolle).' },
                { type: 'command', name: '/pause', desc: 'Wiedergabe pausieren oder fortsetzen.' },
                { type: 'command', name: '/stop', desc: 'Stoppen und Queue leeren.' },
                { type: 'command', name: '/queue', desc: 'Aktuelle Warteschlange anzeigen.' },
                { type: 'command', name: '/shuffle', desc: 'Queue zufaellig mischen.' },
                { type: 'command', name: '/loop [modus]', desc: 'Loop-Modus setzen: off, song oder queue.' },
                { type: 'command', name: '/volume [%]', desc: 'Lautstaerke aendern (0-200%).' },
                { type: 'command', name: '/seek <zeit>', desc: 'Zu Position springen (z.B. 1:30).' },
                { type: 'command', name: '/app', desc: 'Web Player mit Zugangscode oeffnen.' },
            ],
        },
    },
    {
        id: 'soundboard-commands',
        label: 'Soundboard Commands',
        icon: <GraphicEqIcon sx={{ fontSize: 18 }} />,
        content: {
            title: 'Soundboard Commands',
            body: [
                { type: 'text', value: 'Der Soundboard Bot hat 5 Commands:' },
                { type: 'command', name: '/sound <name>', desc: 'Sound suchen und abspielen. Autocomplete fuer Soundnamen.' },
                { type: 'command', name: '/favorite <name>', desc: 'Sound als Favorit markieren oder entfernen.' },
                { type: 'command', name: '/soundboard', desc: 'Interaktives Panel mit Buttons und Menues oeffnen.' },
                { type: 'command', name: '/dashboard', desc: 'Web-Dashboard zum Verwalten und Hochladen.' },
                { type: 'command', name: '/volume <prozent>', desc: 'Persoenliche Lautstaerke setzen (0-200%).' },
            ],
        },
    },
    {
        id: 'troubleshooting',
        label: 'Troubleshooting',
        icon: <HelpIcon sx={{ fontSize: 18 }} />,
        content: {
            title: 'Troubleshooting',
            body: [
                { type: 'heading', value: 'Bot reagiert nicht' },
                { type: 'text', value: 'Stelle sicher, dass der Bot die noetigen Berechtigungen hat und online ist. Pruefe ob Slash Commands fuer den Channel aktiviert sind.' },
                { type: 'heading', value: 'Kein Sound' },
                { type: 'text', value: 'Der Bot muss Berechtigungen zum Verbinden und Sprechen im Voice Channel haben. Pruefe auch ob der Bot nicht stumm geschaltet ist.' },
                { type: 'heading', value: 'Web Player verbindet nicht' },
                { type: 'text', value: 'Stelle sicher, dass der Zugangscode aktuell ist (max. 7 Tage). Nutze /app fuer einen neuen Code.' },
                { type: 'heading', value: 'Sound Upload schlaegt fehl' },
                { type: 'text', value: 'Erlaubte Formate: MP3, WAV, OGG, WebM. Maximale Dateigroesse: 5 MB.' },
            ],
        },
    },
];

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
    const [activeSection, setActiveSection] = useState('getting-started');
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

import { useState } from 'react';
import {
    Box, Typography, Container, Stack, Chip, Tabs, Tab, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
`;

const botCommands = [
    {
        bot: 'BeatByte',
        icon: <MusicNoteIcon sx={{ fontSize: 18 }} />,
        commands: [
            { name: '/play <query>', desc: 'Song oder Playlist abspielen. YouTube-URLs und Suchbegriffe.' },
            { name: '/playnow <query>', desc: 'Sofort abspielen, Queue ueberspringen.' },
            { name: '/skip', desc: 'Aktuellen Song ueberspringen.' },
            { name: '/pause', desc: 'Wiedergabe pausieren oder fortsetzen.' },
            { name: '/stop', desc: 'Stoppen und Queue leeren.' },
            { name: '/queue', desc: 'Aktuelle Warteschlange anzeigen.' },
            { name: '/nowplaying', desc: 'Details zum aktuellen Song.' },
            { name: '/clear', desc: 'Queue leeren, aktuellen Song behalten.' },
            { name: '/remove <pos>', desc: 'Song nach Position entfernen.' },
            { name: '/shuffle', desc: 'Queue zufaellig mischen.' },
            { name: '/loop [modus]', desc: 'Loop-Modus: off, song oder queue.' },
            { name: '/seek <zeit>', desc: 'Zu Position springen (z.B. 1:30).' },
            { name: '/volume [%]', desc: 'Lautstaerke aendern (0-200%).' },
            { name: '/join', desc: 'Voice Channel beitreten.' },
            { name: '/lyrics [query]', desc: 'Songtexte suchen.' },
            { name: '/app', desc: 'Web Player mit Zugangscode oeffnen.' },
        ],
    },
    {
        bot: 'EarTastic',
        icon: <GraphicEqIcon sx={{ fontSize: 18 }} />,
        commands: [
            { name: '/sound <name>', desc: 'Sound suchen und abspielen. Autocomplete fuer Namen.' },
            { name: '/favorite <name>', desc: 'Sound als Favorit markieren oder entfernen.' },
            { name: '/soundboard', desc: 'Interaktives Soundboard-Panel mit Buttons.' },
            { name: '/dashboard', desc: 'Web-Dashboard zum Verwalten und Hochladen.' },
            { name: '/volume <prozent>', desc: 'Persoenliche Lautstaerke setzen (0-200%).' },
        ],
    },
];

export default function Commands() {
    const [tab, setTab] = useState(0);
    const current = botCommands[tab];

    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1 }}>
                        Commands
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Alle Slash-Commands unserer Bots auf einen Blick.
                    </Typography>
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                    sx={{
                        mb: 4, minHeight: 40,
                        '& .MuiTab-root': {
                            minHeight: 40, textTransform: 'none', fontWeight: 600,
                            fontSize: '0.9rem', color: '#71717a', px: 2,
                            '&.Mui-selected': { color: '#fafafa' },
                        },
                        '& .MuiTabs-indicator': {
                            background: 'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius: 1, height: 2,
                        },
                    }}>
                    {botCommands.map((b, i) => (
                        <Tab key={i} icon={b.icon} iconPosition="start" label={`${b.bot} (${b.commands.length})`} />
                    ))}
                </Tabs>

                <Stack spacing={1}>
                    {current.commands.map((cmd, i) => (
                        <Box key={cmd.name} sx={{
                            display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 0.5, sm: 2 },
                            p: 2, borderRadius: 2, bgcolor: '#18181b',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'border-color 0.15s',
                            animation: `${fadeIn} 0.25s ease ${i * 0.02}s both`,
                            '&:hover': { borderColor: 'rgba(168,85,247,0.15)' },
                        }}>
                            <Typography sx={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.825rem',
                                fontWeight: 600, color: '#a855f7', whiteSpace: 'nowrap', minWidth: 180,
                            }}>
                                {cmd.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                {cmd.desc}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

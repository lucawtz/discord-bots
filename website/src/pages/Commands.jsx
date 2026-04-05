import { useState } from 'react';
import {
    Box, Typography, Container, Stack, Chip, Tabs, Tab, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useLanguage } from '../i18n/LanguageContext';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
`;

export default function Commands() {
    const { t } = useLanguage();
    const [tab, setTab] = useState(0);

    const botCommands = [
        {
            bot: 'BeatByte',
            icon: <MusicNoteIcon sx={{ fontSize: 18 }} />,
            commands: [
                { name: '/play <query>', desc: t('commands.beatbyte.play') },
                { name: '/playnow <query>', desc: t('commands.beatbyte.playnow') },
                { name: '/skip', desc: t('commands.beatbyte.skip') },
                { name: '/pause', desc: t('commands.beatbyte.pause') },
                { name: '/stop', desc: t('commands.beatbyte.stop') },
                { name: '/queue', desc: t('commands.beatbyte.queue') },
                { name: '/nowplaying', desc: t('commands.beatbyte.nowplaying') },
                { name: '/clear', desc: t('commands.beatbyte.clear') },
                { name: '/remove <pos>', desc: t('commands.beatbyte.remove') },
                { name: '/shuffle', desc: t('commands.beatbyte.shuffle') },
                { name: '/loop [modus]', desc: t('commands.beatbyte.loop') },
                { name: '/seek <zeit>', desc: t('commands.beatbyte.seek') },
                { name: '/volume [%]', desc: t('commands.beatbyte.volume') },
                { name: '/join', desc: t('commands.beatbyte.join') },
                { name: '/lyrics [query]', desc: t('commands.beatbyte.lyrics') },
                { name: '/app', desc: t('commands.beatbyte.app') },
            ],
        },
        {
            bot: 'EarTastic',
            icon: <GraphicEqIcon sx={{ fontSize: 18 }} />,
            commands: [
                { name: '/sound <name>', desc: t('commands.eartastic.sound') },
                { name: '/favorite <name>', desc: t('commands.eartastic.favorite') },
                { name: '/soundboard', desc: t('commands.eartastic.soundboard') },
                { name: '/dashboard', desc: t('commands.eartastic.dashboard') },
                { name: '/volume <prozent>', desc: t('commands.eartastic.volume') },
            ],
        },
    ];

    const current = botCommands[tab];

    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1 }}>
                        {t('commands.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('commands.subtitle')}
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

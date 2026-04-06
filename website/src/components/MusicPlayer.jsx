import { Box, Typography, Stack } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

const BEATBYTE_AVATAR = 'https://cdn.discordapp.com/avatars/1488919318472298647/f2829ad185e6a0fff4d7d064cdfdbb3e.png?size=64';

function DiscordButton({ children, primary, danger, link }) {
    return (
        <Box sx={{
            px: 2, py: 0.75, borderRadius: 1,
            fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: danger ? '#4e1516' : primary ? '#5865F2' : '#4e5058',
            color: danger ? '#fafafa' : '#fafafa',
            transition: 'filter 0.15s',
            '&:hover': { filter: 'brightness(1.15)' },
        }}>
            {children}
        </Box>
    );
}

export default function MusicPlayer() {
    // Progress bar matching the bot's style
    const filled = 7;
    const empty = 13;
    const bar = '━'.repeat(filled) + '●' + '─'.repeat(empty);

    return (
        <Box sx={{
            bgcolor: '#2b2d31', borderRadius: 2, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            maxWidth: 520,
        }}>
            <Stack direction="row">
                {/* Accent bar */}
                <Box sx={{ width: 4, bgcolor: '#6E41CC', flexShrink: 0 }} />

                <Box sx={{ flex: 1, p: 2, pb: 1 }}>
                    {/* Author */}
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
                        <Box component="img" src={BEATBYTE_AVATAR} alt=""
                            sx={{ width: 20, height: 20, borderRadius: '50%' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#fafafa' }}>
                            Now playing
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Title - heading style like ### in Discord */}
                            <Typography sx={{
                                fontSize: '1.1rem', fontWeight: 700, color: '#fafafa',
                                mb: 0.25, lineHeight: 1.3,
                            }}>
                                Blinding Lights
                            </Typography>

                            {/* Artist - italic like *artist* in Discord */}
                            <Typography sx={{ fontSize: '0.85rem', color: '#b5bac1', fontStyle: 'italic', mb: 1.5 }}>
                                The Weeknd
                            </Typography>

                            {/* Progress bar */}
                            <Typography sx={{
                                fontSize: '0.78rem', color: '#b5bac1', fontFamily: 'monospace',
                                letterSpacing: 0.5, mb: 1,
                            }}>
                                <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.06)', px: 0.5, borderRadius: 0.5, fontSize: '0.72rem' }}>1:13</Box>
                                {' '}{bar}{' '}
                                <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.06)', px: 0.5, borderRadius: 0.5, fontSize: '0.72rem' }}>3:20</Box>
                            </Typography>

                            {/* Status line - small text like -# in Discord */}
                            <Typography sx={{ fontSize: '0.65rem', color: '#4e5058', mb: 0.5 }}>
                                Luca  ·  📋 3 in Queue  ·  🤖 Auto-DJ
                            </Typography>
                        </Box>

                        {/* Thumbnail */}
                        <Box sx={{
                            width: 100, height: 100, borderRadius: 1.5, flexShrink: 0,
                            overflow: 'hidden', alignSelf: 'flex-start',
                            background: 'linear-gradient(135deg, #2a1a3e 0%, #0d0520 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                        }}>
                            <Box sx={{
                                position: 'absolute', width: '60%', height: '60%',
                                borderRadius: '50%', opacity: 0.25,
                                background: 'radial-gradient(circle, #a855f7, transparent 70%)',
                                filter: 'blur(15px)',
                            }} />
                            <MusicNoteIcon sx={{ fontSize: 36, opacity: 0.15, color: '#a855f7', position: 'relative' }} />
                        </Box>
                    </Stack>
                </Box>
            </Stack>

            {/* Button Row 1 - Main controls */}
            <Stack direction="row" spacing={0.5} sx={{ px: 2, pb: 0.5 }}>
                <DiscordButton primary>⏯️</DiscordButton>
                <DiscordButton>⏭️</DiscordButton>
                <DiscordButton danger>⏹️</DiscordButton>
            </Stack>

            {/* Button Row 2 - Secondary controls */}
            <Stack direction="row" spacing={0.5} sx={{ px: 2, pb: 1.5 }}>
                <DiscordButton>🔀</DiscordButton>
                <DiscordButton>🔁</DiscordButton>
                <DiscordButton link>🎧 Web Player</DiscordButton>
            </Stack>
        </Box>
    );
}

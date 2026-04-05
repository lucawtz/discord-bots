import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, CardContent,
    Chip, Stack, Container, Avatar, keyframes,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
`;

// Discord CDN avatar URLs
// Format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png?size=128
const bots = [
    {
        name: 'BeatByte', subtitle: 'Music Bot', commands: 16, status: 'online',
        description: 'YouTube-Streaming mit Queue-Management, Playlists, Auto-DJ, Lyrics und einem Web Player im Spotify-Style. Auch als Desktop App verfuegbar.',
        discordId: '1489420168957394984',
        avatarHash: null, // Noch kein Avatar gesetzt
        fallbackIcon: <MusicNoteIcon sx={{ fontSize: 22 }} />,
        highlights: ['16 Commands', 'Web Player', 'Auto-DJ', 'Playlists', 'Desktop App'],
        path: '/bots/music-bot', inviteUrl: BEATBYTE_INVITE,
    },
    {
        name: 'EarTastic', subtitle: 'Soundboard Bot', commands: 5, status: 'online',
        description: 'Custom Sounds, Memes und Effekte per Knopfdruck. Mit Web-Dashboard, Sound-Upload, Favoriten und 10 Kategorien.',
        discordId: '1488966705488330932',
        avatarHash: '96e1cfe3af1b12407f702d356d916038',
        fallbackIcon: <GraphicEqIcon sx={{ fontSize: 22 }} />,
        highlights: ['Custom Upload', 'Web Dashboard', '10 Kategorien', 'Favoriten'],
        path: '/bots/soundboard-bot', inviteUrl: SOUNDBOARD_INVITE,
    },
    {
        name: 'Mehr bald...', subtitle: 'In Entwicklung', commands: null, status: 'offline',
        description: 'Weitere Bots fuer Moderation, Utility, Leveling und mehr sind in Planung.',
        discordId: null, avatarHash: null,
        fallbackIcon: <AutoAwesomeIcon sx={{ fontSize: 22 }} />,
        highlights: [],
        path: null, inviteUrl: null, comingSoon: true,
    },
];

function BotAvatar({ bot, size = 48 }) {
    const avatarUrl = bot.avatarHash
        ? `https://cdn.discordapp.com/avatars/${bot.discordId}/${bot.avatarHash}.png?size=128`
        : null;

    return (
        <Box sx={{ position: 'relative' }}>
            <Avatar
                src={avatarUrl}
                sx={{
                    width: size, height: size, borderRadius: 2,
                    bgcolor: avatarUrl ? 'transparent' : undefined,
                    background: avatarUrl ? undefined : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                }}
            >
                {!avatarUrl && bot.fallbackIcon}
            </Avatar>
            {bot.status && !bot.comingSoon && (
                <FiberManualRecordIcon sx={{
                    position: 'absolute', bottom: -2, right: -2, fontSize: 14,
                    color: bot.status === 'online' ? '#34d399' : '#52525b',
                    bgcolor: '#18181b', borderRadius: '50%',
                }} />
            )}
        </Box>
    );
}

export default function Bots() {
    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 6, animation: `${fadeIn} 0.4s ease` }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1 }}>
                        Alle Bots
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Waehle einen Bot um mehr zu erfahren oder lade ihn direkt auf deinen Server ein.
                    </Typography>
                </Box>

                <Stack spacing={2}>
                    {bots.map((bot, i) => (
                        <Card key={i} sx={{
                            bgcolor: '#18181b', opacity: bot.comingSoon ? 0.4 : 1,
                            transition: 'all 0.2s ease',
                            animation: `${fadeIn} 0.3s ease ${i * 0.06}s both`,
                            '&:hover': bot.comingSoon ? {} : {
                                borderColor: 'rgba(168,85,247,0.2)',
                                boxShadow: '0 8px 32px rgba(168,85,247,0.06)',
                            },
                        }}>
                            <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
                                    {/* Avatar + Info */}
                                    <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ flex: 1 }}>
                                        <BotAvatar bot={bot} size={52} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{bot.name}</Typography>
                                                <Typography variant="caption" color="text.disabled">• {bot.subtitle}</Typography>
                                                {bot.commands && (
                                                    <Chip label={`${bot.commands} Cmds`} size="small"
                                                        sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(168,85,247,0.08)', color: '#c084fc' }} />
                                                )}
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                                                {bot.description}
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                {bot.highlights?.map((h) => (
                                                    <Typography key={h} variant="caption" sx={{
                                                        px: 1.5, py: 0.25, borderRadius: 1,
                                                        bgcolor: 'rgba(168,85,247,0.06)', color: '#a1a1aa',
                                                        fontSize: '0.68rem',
                                                    }}>
                                                        {h}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Stack>

                                    {/* Actions */}
                                    {!bot.comingSoon ? (
                                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                                            <Button component={Link} to={bot.path} size="small" variant="outlined"
                                                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                                                sx={{
                                                    borderColor: 'rgba(255,255,255,0.1)', color: '#fafafa', px: 2,
                                                    '&:hover': { borderColor: 'rgba(255,255,255,0.2)' },
                                                }}>
                                                Details
                                            </Button>
                                            <Button size="small" variant="contained" href={bot.inviteUrl} target="_blank"
                                                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                                sx={{
                                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', px: 2,
                                                    '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #9333ea)' },
                                                }}>
                                                Einladen
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Chip label="Coming Soon" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#52525b' }} />
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

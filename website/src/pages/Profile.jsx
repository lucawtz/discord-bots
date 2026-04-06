import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box, Typography, Container, Stack, Avatar, keyframes,
    Card, CardContent, Chip, Button,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LogoutIcon from '@mui/icons-material/Logout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useLanguage } from '../i18n/LanguageContext';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE, API_BASE } from '../config';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const BEATBYTE_AVATAR = 'https://cdn.discordapp.com/avatars/1488919318472298647/f2829ad185e6a0fff4d7d064cdfdbb3e.png?size=128';
const EARTASTIC_AVATAR = 'https://cdn.discordapp.com/avatars/1488966705488330932/96e1cfe3af1b12407f702d356d916038.png?size=128';

export default function Profile() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('discord_user');
        if (!stored) { navigate('/'); return; }
        try { setUser(JSON.parse(stored)); } catch { navigate('/'); }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('discord_user');
        localStorage.removeItem('discord_access_token');
        navigate('/');
    };

    const getCreationDate = (id) => {
        if (!id) return null;
        const timestamp = Number(BigInt(id) >> 22n) + 1420070400000;
        return new Date(timestamp);
    };

    if (!user) return null;
    const createdAt = getCreationDate(user.id);

    const bots = [
        {
            name: 'BeatByte',
            subtitle: t('bots.beatbyte.subtitle'),
            avatar: BEATBYTE_AVATAR,
            accent: '#a855f7',
            accentRgb: '168,85,247',
            detailsPath: '/bots/music-bot',
            inviteUrl: BEATBYTE_INVITE,
            appUrl: API_BASE,
            appLabel: 'Web Player',
        },
        {
            name: 'EarTastic',
            subtitle: t('bots.eartastic.subtitle'),
            avatar: EARTASTIC_AVATAR,
            accent: '#38bdf8',
            accentRgb: '56,189,248',
            detailsPath: '/bots/soundboard-bot',
            inviteUrl: SOUNDBOARD_INVITE,
            appUrl: null,
            appLabel: null,
        },
    ];

    return (
        <Box>
            {/* ---- Hero ---- */}
            <Box sx={{
                minHeight: '55vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', px: 3,
                position: 'relative', overflow: 'hidden', pt: 4,
            }}>
                <Box sx={{
                    position: 'absolute', inset: 0, opacity: 0.2,
                    backgroundImage: 'radial-gradient(rgba(168,85,247,0.08) 1px, transparent 1px)',
                    backgroundSize: '32px 32px', pointerEvents: 'none',
                }} />
                <Box sx={{
                    position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
                    width: 500, height: 500, borderRadius: '50%', opacity: 0.08,
                    background: 'radial-gradient(circle, #a855f7 0%, transparent 60%)',
                    filter: 'blur(80px)', pointerEvents: 'none',
                }} />

                <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Avatar */}
                    <Box sx={{
                        display: 'inline-block', p: '3px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7, #d946ef, #38bdf8)',
                        animation: `${fadeIn} 0.5s ease both`, mb: 3,
                    }}>
                        <Avatar src={user.avatar} sx={{
                            width: 96, height: 96, fontSize: '2.5rem', fontWeight: 700,
                            border: '4px solid #09090b', bgcolor: '#18181b', color: '#a855f7',
                        }}>
                            {user.username?.[0]?.toUpperCase()}
                        </Avatar>
                    </Box>

                    <Typography variant="h3" sx={{
                        fontWeight: 800, fontSize: { xs: '1.75rem', sm: '2.25rem' },
                        letterSpacing: '-0.02em', animation: `${fadeIn} 0.5s ease 0.05s both`,
                    }}>
                        {user.username}
                    </Typography>

                    {createdAt && (
                        <Chip
                            icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                            label={`Discord seit ${createdAt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`}
                            size="small"
                            sx={{
                                mt: 1.5, bgcolor: 'rgba(255,255,255,0.04)', color: '#a1a1aa',
                                border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem',
                                '& .MuiChip-icon': { color: '#71717a' },
                                animation: `${fadeIn} 0.5s ease 0.1s both`,
                            }}
                        />
                    )}

                    <Box sx={{ mt: 3, animation: `${fadeIn} 0.5s ease 0.15s both` }}>
                        <Button size="small" onClick={handleLogout}
                            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                color: '#71717a', fontSize: '0.8rem', textTransform: 'none',
                                '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.06)' },
                            }}>
                            {t('nav.logout')}
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* ---- Bots ---- */}
            <Box sx={{ px: 3, pb: 10 }}>
                <Container maxWidth="md">
                    <Typography sx={{
                        fontWeight: 700, fontSize: '1.1rem', mb: 3,
                        animation: `${fadeIn} 0.5s ease 0.2s both`,
                    }}>
                        {t('profile.yourBots')}
                    </Typography>

                    <Stack spacing={2}>
                        {bots.map((bot, idx) => (
                            <Card key={bot.name} sx={{
                                bgcolor: '#141416',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                animation: `${fadeIn} 0.5s ease ${0.25 + idx * 0.08}s both`,
                                '&:hover': {
                                    borderColor: `rgba(${bot.accentRgb},0.2)`,
                                    boxShadow: `0 12px 40px rgba(${bot.accentRgb},0.08)`,
                                },
                            }}>
                                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                                        {/* Bot Info */}
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                                            <Avatar src={bot.avatar} sx={{
                                                width: 52, height: 52, borderRadius: 2,
                                                border: `2px solid rgba(${bot.accentRgb},0.3)`,
                                            }} />
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                                    {bot.name}
                                                </Typography>
                                                <Typography sx={{ color: '#71717a', fontSize: '0.82rem' }}>
                                                    {bot.subtitle}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        {/* Actions */}
                                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                                            <Button component={Link} to={bot.detailsPath} size="small"
                                                sx={{
                                                    color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 600,
                                                    textTransform: 'none', px: 2,
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 2,
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: '#fafafa' },
                                                }}>
                                                {t('profile.details')}
                                            </Button>
                                            {bot.appUrl && (
                                                <Button href={bot.appUrl} target="_blank" rel="noopener" size="small"
                                                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                                    sx={{
                                                        bgcolor: `rgba(${bot.accentRgb},0.1)`,
                                                        color: bot.accent, fontSize: '0.8rem', fontWeight: 600,
                                                        textTransform: 'none', px: 2,
                                                        border: `1px solid rgba(${bot.accentRgb},0.15)`,
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: `rgba(${bot.accentRgb},0.18)` },
                                                    }}>
                                                    {bot.appLabel}
                                                </Button>
                                            )}
                                            <Button href={bot.inviteUrl} target="_blank" rel="noopener" size="small"
                                                sx={{
                                                    bgcolor: '#5865F2', color: '#fff',
                                                    fontSize: '0.8rem', fontWeight: 600,
                                                    textTransform: 'none', px: 2, borderRadius: 2,
                                                    '&:hover': { bgcolor: '#4752C4' },
                                                }}>
                                                {t('bots.invite')}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

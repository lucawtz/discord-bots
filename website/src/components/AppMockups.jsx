import { Box, Typography, Stack } from '@mui/material';
import { MONO_FONT } from './ui';
import beatbyteAvatar from '../assets/beatbyte-avatar.png';

// Browser-gerahmte Web-App-Mockups (BeatByte Web-Player, EarTastic Dashboard).
// Rein gerendert — ersetzen die Screenshot-Platzhalter auf den Detailseiten,
// ohne dass echte Screenshots noetig sind. Passend zum Discord-Mockup-System
// in DiscordMockups.jsx.

// Fenster-Chrome: Ampel-Punkte + URL-Pille. Kapselt jedes Web-App-Mockup.
export function BrowserFrame({ url = 'bytebots.de', accent = '#a855f7', children, sx = {} }) {
    return (
        <Box sx={{
            borderRadius: '12px', overflow: 'hidden', width: '100%',
            bgcolor: '#0d0d12', border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: `0 40px 90px -34px rgba(0,0,0,0.85), 0 0 0 1px ${accent}22`,
            ...sx,
        }}>
            {/* Titelleiste */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                px: 1.75, py: 1.1, bgcolor: '#141419', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <Stack direction="row" spacing={0.75}>
                    {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                        <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, opacity: 0.9 }} />
                    ))}
                </Stack>
                <Box sx={{
                    flex: 1, minWidth: 0, height: 24, borderRadius: '7px',
                    bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25,
                }}>
                    <Box component="span" sx={{ fontSize: '0.7rem', color: accent }}>🔒</Box>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {url}
                    </Typography>
                </Box>
            </Stack>
            {children}
        </Box>
    );
}

// Kleiner Cover-Baustein mit Gradient + Musiknote-Glow (statt echter Album-Art).
function Cover({ size, radius = '8px' }) {
    return (
        <Box sx={{
            width: size, height: size, borderRadius: radius, flexShrink: 0, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #2a1a3e 0%, #0d0520 100%)',
        }}>
            <Box sx={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Box sx={{
                    position: 'absolute', width: '55%', height: '55%', borderRadius: '50%', opacity: 0.35,
                    background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(14px)',
                }} />
                <Box component="span" sx={{ fontSize: size * 0.34, position: 'relative', opacity: 0.85 }}>🎵</Box>
            </Box>
        </Box>
    );
}

// BeatByte Web-Player im Browser-Rahmen: Sidebar-Nav, grosses Now-Playing mit
// Cover/Fortschritt/Controls, darunter eine Queue-Liste.
export function WebPlayerMock({ url = 'beatbyte.bytebots.de' }) {
    const accent = '#a855f7';
    const queue = [
        { t: 'Strobe', a: 'deadmau5' },
        { t: 'Opus', a: 'Eric Prydz' },
        { t: 'Genesis', a: 'Justice' },
    ];
    const bar = '━'.repeat(7) + '●' + '─'.repeat(12);
    return (
        <BrowserFrame url={url} accent={accent}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '132px 1fr' } }}>
                {/* Sidebar */}
                <Stack spacing={0.5} sx={{ p: 1.5, borderRight: '1px solid rgba(255,255,255,0.05)', display: { xs: 'none', sm: 'flex' } }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <Box component="img" src={beatbyteAvatar} alt="BeatByte" sx={{ width: 26, height: 26, borderRadius: '50%' }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#fafafa' }}>BeatByte</Typography>
                    </Stack>
                    {[['🔥', 'Discover', true], ['📋', 'Queue', false], ['🎵', 'Playlists', false], ['⚙️', 'Settings', false]].map(([icon, label, active]) => (
                        <Stack key={label} direction="row" alignItems="center" spacing={1} sx={{
                            px: 1, py: 0.65, borderRadius: '8px',
                            bgcolor: active ? `${accent}1f` : 'transparent',
                            color: active ? '#e9d5ff' : '#a1a1aa',
                        }}>
                            <Box component="span" sx={{ fontSize: '0.82rem' }}>{icon}</Box>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 600 : 500 }}>{label}</Typography>
                        </Stack>
                    ))}
                </Stack>

                {/* Main */}
                <Box sx={{ p: { xs: 1.75, sm: 2.25 }, minWidth: 0 }}>
                    <Stack direction="row" spacing={2}>
                        <Cover size={96} radius="12px" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.66rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>
                                Now Playing
                            </Typography>
                            <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#fafafa', mt: 0.5, lineHeight: 1.2 }}>Strobe</Typography>
                            <Typography sx={{ fontSize: '0.9rem', color: '#a1a1aa' }}>deadmau5</Typography>
                            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: '#8b8b95', mt: 1.25, letterSpacing: '-0.04em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                3:41 {bar} 10:37
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                                {['🔀', '⏮️', '⏸️', '⏭️', '🔁'].map((e, i) => (
                                    <Box key={i} sx={{
                                        width: i === 2 ? 40 : 32, height: i === 2 ? 40 : 32, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 2 ? '1rem' : '0.85rem',
                                        bgcolor: i === 2 ? accent : 'rgba(255,255,255,0.06)', color: '#fff',
                                    }}>{e}</Box>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Queue */}
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.64rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#71717a', mt: 2.25, mb: 1 }}>
                        Als Naechstes
                    </Typography>
                    <Stack spacing={0.75}>
                        {queue.map((q, i) => (
                            <Stack key={q.t} direction="row" alignItems="center" spacing={1.25} sx={{
                                px: 1, py: 0.75, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.03)',
                            }}>
                                <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: '#71717a', width: 16 }}>{i + 1}</Typography>
                                <Cover size={28} radius="5px" />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7', lineHeight: 1.2 }}>{q.t}</Typography>
                                    <Typography sx={{ fontSize: '0.72rem', color: '#8b8b95' }}>{q.a}</Typography>
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            </Box>
        </BrowserFrame>
    );
}

// EarTastic Web-Dashboard im Browser-Rahmen: Header, Kategorie-Chips, Grid aus
// Sound-Kacheln, Upload-Button.
export function DashboardMock({ url = 'soundboard.bytebots.de' }) {
    const accent = '#22d3ee';
    const cats = ['Alle', 'Meme', 'Gaming', 'Musik', 'Favoriten'];
    const sounds = [
        { n: 'Airhorn', e: '📯', fav: false }, { n: 'Vine Boom', e: '💥', fav: true },
        { n: 'Bruh', e: '😐', fav: false }, { n: 'Drop', e: '🔊', fav: false },
        { n: 'Tada', e: '🎉', fav: true }, { n: 'Applaus', e: '👏', fav: false },
        { n: 'Trommel', e: '🥁', fav: false }, { n: 'Quack', e: '🦆', fav: false },
    ];
    return (
        <BrowserFrame url={url} accent={accent}>
            <Box sx={{ p: { xs: 1.75, sm: 2.25 } }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.75 }}>
                    <Box>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#fafafa', lineHeight: 1.2 }}>Soundboard</Typography>
                        <Typography sx={{ fontSize: '0.74rem', color: '#8b8b95' }}>34 Sounds · 8 Kategorien</Typography>
                    </Box>
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75, height: 34, px: 1.75, borderRadius: '9px',
                        bgcolor: accent, color: '#06232b', fontSize: '0.8rem', fontWeight: 700,
                    }}>
                        <Box component="span" sx={{ fontSize: '0.95rem' }}>⬆️</Box> Upload
                    </Box>
                </Stack>

                {/* Kategorie-Chips */}
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.75 }}>
                    {cats.map((c, i) => (
                        <Box key={c} sx={{
                            height: 28, px: 1.4, borderRadius: '999px', display: 'flex', alignItems: 'center',
                            fontSize: '0.74rem', fontWeight: 600,
                            bgcolor: i === 0 ? `${accent}22` : 'rgba(255,255,255,0.05)',
                            color: i === 0 ? '#a5f3fc' : '#a1a1aa',
                            border: `1px solid ${i === 0 ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
                        }}>{c}</Box>
                    ))}
                </Stack>

                {/* Sound-Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                    {sounds.map((s) => (
                        <Box key={s.n} sx={{
                            position: 'relative', aspectRatio: '1.4', borderRadius: '10px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                            bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            {s.fav && <Box component="span" sx={{ position: 'absolute', top: 5, right: 7, fontSize: '0.7rem', color: accent }}>★</Box>}
                            <Box component="span" sx={{ fontSize: '1.35rem' }}>{s.e}</Box>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#d4d4d8' }}>{s.n}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        </BrowserFrame>
    );
}

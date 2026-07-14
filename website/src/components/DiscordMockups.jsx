import { useEffect, useState } from 'react';
import { Box, Typography, Stack, keyframes } from '@mui/material';
import { BotAvatar, MONO_FONT } from './ui';

// Discord-Nachrichten-Mockups der Bots — 1:1 nach den echten Embeds im Bot-Code
// (buildNowPlayingEmbed / buildSoundboardPanel). Geteilt zwischen der Bots-Uebersicht
// und den Produkt-Detailseiten, damit ueberall exakt dasselbe Embed erscheint.

const floaty = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-11px); }
`;

// Discord-Dark-Theme-Farben, damit die Mockups exakt wie in Discord aussehen
const DC = {
    chat: '#313338',
    embed: '#2b2d31',
    text: '#dbdee1',
    heading: '#f2f3f5',
    muted: '#949ba4',
    code: '#1e1f22',
    blurple: '#5865f2',
    secondary: '#4e5058',
    danger: '#da373c',
    success: '#248046',
};

// Discord-Button (32px hoch, 3px Radius) in den vier echten ButtonStyles
function DcBtn({ variant = 'secondary', emoji, label, disabled, link }) {
    const bg = { primary: DC.blurple, secondary: DC.secondary, danger: DC.danger, success: DC.success }[variant];
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
            height: 32, minWidth: label ? 60 : 44, px: label ? 1.75 : 1,
            borderRadius: '3px', bgcolor: bg, color: '#fff',
            fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap',
            opacity: disabled ? 0.45 : 1, cursor: 'default',
        }}>
            {emoji && <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</Box>}
            {label}
            {link && (
                <Box component="svg" viewBox="0 0 24 24" sx={{ width: 14, height: 14, opacity: 0.9 }}>
                    <path fill="currentColor" d="M10 5V3H5.375C4.06 3 3 4.06 3 5.375v13.25C3 19.94 4.06 21 5.375 21h13.25C19.94 21 21 19.94 21 18.625V14h-2v5H5V5h5Zm3-2v2h4.586l-7.293 7.293 1.414 1.414L19 6.414V11h2V3h-8Z" />
                </Box>
            )}
        </Box>
    );
}

// Discord-Nachricht als Rahmen fuer die Bot-Mockups — Chat-Hintergrund und
// Typografie entsprechen dem Discord-Dark-Theme
function DiscordMsg({ bot, name, t, children, delay = 0, ring }) {
    return (
        <Box sx={{ animation: `${floaty} 7s ease-in-out infinite`, animationDelay: `${delay}s` }}>
            <Box sx={{
                bgcolor: DC.chat, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                p: { xs: 2, sm: 2.5 },
                boxShadow: `0 44px 90px -34px rgba(0,0,0,0.85), 0 0 0 1px ${ring}`,
            }}>
                <Stack direction="row" spacing={1.5}>
                    <BotAvatar bot={bot} size={40} sx={{ border: 'none', boxShadow: 'none' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ mb: 0.75 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.94rem', color: DC.heading }}>{name}</Typography>
                            <Box component="span" sx={{
                                fontSize: '0.6rem', fontWeight: 700, bgcolor: DC.blurple, color: '#fff',
                                px: 0.6, py: 0.1, borderRadius: '3px', letterSpacing: '0.02em', lineHeight: 1.5,
                            }}>
                                BOT
                            </Box>
                            <Typography sx={{ fontSize: '0.7rem', color: DC.muted }}>{t('bots.mockToday')}</Typography>
                        </Stack>
                        {children}
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
}

// Now-Playing-Embed des Music-Bots — 1:1 nach buildNowPlayingEmbed:
// Author-Zeile "Now playing", Titel als H3 in der Description, Text-Fortschrittsbalken
// (20 Segmente ━ ● ─, Zeiten als Inline-Code), Subtext-Zeile, Quadrat-Cover als Thumbnail,
// Farbe #6E41CC, Buttons [⏸️|⏭️|⏹️] + [🔀|🔁|🎧 Web Player]. Balken tickt wie das
// echte 10-Sekunden-Live-Update.
const TRACK_LEN = 637; // 10:37
const TRACK_START = 221; // 3:41

function fmtTime(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function BeatMockup({ t }) {
    const [elapsed, setElapsed] = useState(TRACK_START);
    useEffect(() => {
        const id = setInterval(() => {
            setElapsed((e) => (e + 32 >= TRACK_LEN ? TRACK_START : e + 32));
        }, 1200);
        return () => clearInterval(id);
    }, []);
    const filled = Math.round((elapsed / TRACK_LEN) * 20);
    const bar = '━'.repeat(filled) + '●' + '─'.repeat(Math.max(0, 20 - filled));

    return (
        <DiscordMsg bot="beat" name="BeatByte" t={t} ring="rgba(168,85,247,0.16)">
            <Box sx={{ bgcolor: DC.embed, borderRadius: '4px', borderLeft: '4px solid #6E41CC', p: '12px 16px 14px 12px', maxWidth: 480 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        {/* Author-Zeile */}
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <BotAvatar bot="beat" size={22} sx={{ border: 'none', boxShadow: 'none' }} />
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: DC.heading }}>Now playing</Typography>
                        </Stack>
                        {/* Description: ### Titel, *Artist* */}
                        <Typography sx={{ fontSize: '1.22rem', fontWeight: 700, color: DC.heading, mt: 1, lineHeight: 1.25 }}>
                            Strobe
                        </Typography>
                        <Typography sx={{ fontSize: '0.88rem', fontStyle: 'italic', color: DC.text }}>deadmau5</Typography>
                        {/* `3:41` ━━━●─── `10:37` */}
                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ mt: 1.25, minWidth: 0 }}>
                            <Box component="code" sx={{
                                fontFamily: MONO_FONT, fontSize: '0.72rem', color: DC.text,
                                bgcolor: DC.code, px: 0.5, py: 0.2, borderRadius: '3px', flexShrink: 0,
                            }}>
                                {fmtTime(elapsed)}
                            </Box>
                            <Typography sx={{
                                fontSize: '0.76rem', color: DC.text, letterSpacing: '-0.04em',
                                whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0,
                            }}>
                                {bar}
                            </Typography>
                            <Box component="code" sx={{
                                fontFamily: MONO_FONT, fontSize: '0.72rem', color: DC.text,
                                bgcolor: DC.code, px: 0.5, py: 0.2, borderRadius: '3px', flexShrink: 0,
                            }}>
                                10:37
                            </Box>
                        </Stack>
                        {/* -# Subtext: @Mention · 📋 5 in Queue */}
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.9 }}>
                            <Box component="span" sx={{
                                fontSize: '0.72rem', fontWeight: 500, color: '#c9cdfb',
                                bgcolor: 'rgba(88,101,242,0.3)', px: 0.5, py: 0.1, borderRadius: '3px',
                            }}>
                                @Luca
                            </Box>
                            <Typography sx={{ fontSize: '0.72rem', color: DC.muted }}>·</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: DC.muted }}>📋 5 in Queue</Typography>
                        </Stack>
                    </Box>
                    {/* Quadrat-Cover als Thumbnail rechts */}
                    <Box sx={{
                        width: 80, height: 80, borderRadius: '4px', position: 'relative', overflow: 'hidden', flexShrink: 0,
                        background: 'repeating-linear-gradient(45deg, #2b2140, #2b2140 8px, #231b36 8px, #231b36 16px)',
                    }}>
                        <Box sx={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: MONO_FONT, fontSize: '0.55rem', color: '#8b7bb0', letterSpacing: '0.1em',
                        }}>
                            COVER
                        </Box>
                    </Box>
                </Box>
            </Box>
            {/* Button-Reihen wie createPlayerButtons */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <DcBtn variant="primary" emoji="⏸️" />
                <DcBtn variant="secondary" emoji="⏭️" />
                <DcBtn variant="danger" emoji="⏹️" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <DcBtn variant="secondary" emoji="🔀" />
                <DcBtn variant="secondary" emoji="🔁" />
                <DcBtn variant="secondary" emoji="🎧" label="Web Player" link />
            </Stack>
        </DiscordMsg>
    );
}

// /soundboard-Panel des Soundboard-Bots — 1:1 nach buildSoundboardPanel:
// blurple Embed mit Titel/Description/Footer, Kategorie-Select, Sound-Buttons
// (max 5 pro Reihe, Favoriten blurple), Nav-Reihe [◀|▶|⏹ Stop|🔄 Aktualisieren].
export function EarMockup({ t }) {
    const row1 = ['Airhorn', 'Vine Boom', 'Bruh', 'Drop', 'Tada'];
    const row2 = ['Applaus', 'Trommel', 'Quack'];
    return (
        <DiscordMsg bot="ear" name="EarTastic" t={t} delay={0.8} ring="rgba(34,211,238,0.16)">
            <Box sx={{ bgcolor: DC.embed, borderRadius: '4px', borderLeft: `4px solid ${DC.blurple}`, p: '12px 16px 14px 12px', maxWidth: 480 }}>
                <Typography sx={{ fontSize: '0.94rem', fontWeight: 700, color: DC.heading }}>
                    Soundboard - Vorgegebene Sounds
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: DC.text, mt: 0.75 }}>
                    Klicke auf einen Button um den Sound abzuspielen!
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: DC.muted, mt: 1 }}>
                    Seite 1/1 | 8 Sounds
                </Typography>
            </Box>
            {/* Kategorie-Select */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                mt: 1, maxWidth: 480, height: 40, px: 1.5, borderRadius: '3px',
                bgcolor: DC.code, border: '1px solid #111214',
            }}>
                <Typography sx={{ fontSize: '0.85rem', color: DC.text }}>🎵 Vorgegebene Sounds</Typography>
                <Box component="span" sx={{ color: DC.muted, fontSize: '0.7rem' }}>▼</Box>
            </Box>
            {/* Sound-Buttons: 5 + 3, Favorit blurple */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {row1.map((name, i) => (
                    <DcBtn key={name} variant={i === 1 ? 'primary' : 'secondary'} emoji="🔊" label={name} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {row2.map((name) => (
                    <DcBtn key={name} variant="secondary" emoji="🔊" label={name} />
                ))}
            </Stack>
            {/* Nav-Reihe */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <DcBtn variant="secondary" label="◀" disabled />
                <DcBtn variant="secondary" label="▶" disabled />
                <DcBtn variant="danger" emoji="⏹" label="Stop" />
                <DcBtn variant="success" emoji="🔄" label="Aktualisieren" />
            </Stack>
            <Typography sx={{ fontSize: '0.72rem', color: DC.muted, mt: 1.25 }}>
                👁️ {t('bots.mockEphemeral')}
            </Typography>
        </DiscordMsg>
    );
}

// ── Kompakte Feature-Embeds fuer die Galerie-Raster der Detailseiten ──────────
// Statisch (keine Float-Animation), auf Kachelbreite ausgelegt. Bilden echte
// Bot-Ausgaben nach (Queue, Playlist-Import, Filter, Auto-DJ, Upload, Favoriten).

// Schlanker Discord-Embed-Rahmen mit Titelzeile + optionalem Footer.
function MiniEmbed({ accent = '#6E41CC', icon, title, children, footer }) {
    return (
        <Box sx={{ bgcolor: DC.embed, borderRadius: '4px', borderLeft: `4px solid ${accent}`, p: '11px 15px 13px', width: '100%' }}>
            {title && (
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                    {icon && <Box component="span" sx={{ fontSize: '0.95rem', lineHeight: 1 }}>{icon}</Box>}
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: DC.heading }}>{title}</Typography>
                </Stack>
            )}
            {children}
            {footer && <Typography sx={{ fontSize: '0.68rem', color: DC.muted, mt: 1 }}>{footer}</Typography>}
        </Box>
    );
}

// Eine Titelzeile im Queue-/Listen-Stil: Nummer · Titel — Artist · Dauer
function TrackRow({ n, title, artist, dur, dim }) {
    return (
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ py: 0.35 }}>
            {n != null && <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: DC.muted, width: 16, flexShrink: 0 }}>{n}</Typography>}
            <Typography sx={{ fontSize: '0.8rem', color: dim ? DC.text : DC.heading, fontWeight: dim ? 400 : 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title} <Box component="span" sx={{ color: DC.muted, fontWeight: 400 }}>— {artist}</Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            {dur && <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.7rem', color: DC.muted, flexShrink: 0 }}>{dur}</Typography>}
        </Stack>
    );
}

export function QueueMock() {
    return (
        <MiniEmbed accent="#6E41CC" icon="📋" title="Warteschlange" footer="4 Titel · 14:32 gesamt">
            <Typography sx={{ fontSize: '0.72rem', color: DC.muted, mb: 0.5 }}>▶️ Jetzt: <Box component="span" sx={{ color: DC.heading, fontWeight: 600 }}>Strobe</Box> — deadmau5</Typography>
            <TrackRow n={1} title="Opus" artist="Eric Prydz" dur="9:04" />
            <TrackRow n={2} title="Genesis" artist="Justice" dur="3:54" />
            <TrackRow n={3} title="Ghosts 'n' Stuff" artist="deadmau5" dur="3:20" />
        </MiniEmbed>
    );
}

export function PlaylistMock() {
    return (
        <MiniEmbed accent="#1DB954" icon="🎵" title="Playlist importiert" footer="Quelle: Spotify">
            <Typography sx={{ fontSize: '0.82rem', color: DC.text, mb: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 700, color: DC.heading }}>Chill Vibes</Box> · 32 Titel hinzugefuegt
            </Typography>
            <TrackRow n={1} title="Nightcall" artist="Kavinsky" dim />
            <TrackRow n={2} title="Midnight City" artist="M83" dim />
            <TrackRow n={3} title="Instant Crush" artist="Daft Punk" dim />
        </MiniEmbed>
    );
}

export function FilterMock() {
    const filters = [['Bassboost', true], ['Nightcore', false], ['8D', false], ['Vaporwave', false], ['Karaoke', false]];
    return (
        <MiniEmbed accent="#6E41CC" icon="🎛️" title="Audio Filter" footer="Bassboost aktiv">
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {filters.map(([name, on]) => (
                    <Box key={name} sx={{
                        height: 30, px: 1.25, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        fontSize: '0.75rem', fontWeight: 600,
                        bgcolor: on ? 'rgba(110,65,204,0.25)' : 'rgba(255,255,255,0.05)',
                        color: on ? '#d8b4fe' : DC.text,
                        border: `1px solid ${on ? 'rgba(110,65,204,0.6)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                        {on && <Box component="span" sx={{ fontSize: '0.7rem' }}>✓</Box>}{name}
                    </Box>
                ))}
            </Stack>
        </MiniEmbed>
    );
}

export function AutoDjMock() {
    return (
        <MiniEmbed accent="#6E41CC" icon="🤖" title="Auto-DJ aktiv" footer="Fuellt die Queue automatisch">
            <Typography sx={{ fontSize: '0.82rem', color: DC.text, mb: 0.75 }}>
                Spielt endlos aehnliche Tracks – passend zu deinem Geschmack.
            </Typography>
            <TrackRow title="Als Naechstes: Faded" artist="Alan Walker" dim />
            <TrackRow title="Danach: Wake Me Up" artist="Avicii" dim />
        </MiniEmbed>
    );
}

export function UploadMock() {
    return (
        <MiniEmbed accent="#22d3ee" icon="⬆️" title="Sound hochladen" footer="mp3 · wav · ogg — max. 5 MB">
            <Box sx={{
                border: '1.5px dashed rgba(34,211,238,0.4)', borderRadius: '8px', py: 1.75, mb: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                bgcolor: 'rgba(34,211,238,0.04)',
            }}>
                <Box component="span" sx={{ fontSize: '1.3rem' }}>📁</Box>
                <Typography sx={{ fontSize: '0.76rem', color: DC.text }}>Datei ablegen oder auswaehlen</Typography>
            </Box>
            <Stack direction="row" spacing={0.75}>
                <Box sx={{ flex: 1, height: 30, borderRadius: '6px', bgcolor: DC.code, border: '1px solid #111214', display: 'flex', alignItems: 'center', px: 1 }}>
                    <Typography sx={{ fontSize: '0.74rem', color: DC.muted }}>airhorn.mp3</Typography>
                </Box>
                <Box sx={{ height: 30, px: 1.5, borderRadius: '6px', bgcolor: '#22d3ee', color: '#06232b', display: 'flex', alignItems: 'center', fontSize: '0.76rem', fontWeight: 700 }}>Upload</Box>
            </Stack>
        </MiniEmbed>
    );
}

export function FavoritesMock() {
    const favs = ['Vine Boom', 'Tada', 'Airhorn', 'Bruh'];
    return (
        <MiniEmbed accent="#22d3ee" icon="⭐" title="Favoriten" footer="Schnellzugriff · 1 Klick zum Abspielen">
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {favs.map((n) => (
                    <Box key={n} sx={{
                        height: 30, px: 1.25, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        fontSize: '0.75rem', fontWeight: 600, color: '#a5f3fc',
                        bgcolor: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)',
                    }}>
                        <Box component="span" sx={{ fontSize: '0.7rem' }}>★</Box>{n}
                    </Box>
                ))}
            </Stack>
        </MiniEmbed>
    );
}

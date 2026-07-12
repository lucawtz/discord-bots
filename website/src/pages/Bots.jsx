import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Box, Typography, Button, Card, Stack, Container, keyframes,
} from '@mui/material';
import { BEATBYTE_INVITE, SOUNDBOARD_INVITE } from '../config';
import { useLanguage } from '../i18n/LanguageContext';
import { useLiveStatus } from '../hooks/useLiveStatus';
import {
    PageHead, BotAvatar, ACCENTS, MONO_FONT, DISPLAY_FONT, GHOST_BTN_SX,
} from '../components/ui';

const floaty = keyframes`
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-11px); }
`;

const pulse = keyframes`
    50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
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

function LiveChip({ state, t }) {
    const cfg = {
        up: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.28)', label: t('bots.online') },
        down: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)', label: t('bots.offline') },
        checking: { color: '#a1a1aa', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', label: t('bots.checking') },
    }[state] ?? { color: '#a1a1aa', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', label: t('bots.checking') };
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.9, height: 26, px: 1.4,
            borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0,
            color: cfg.color, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
        }}>
            <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color,
                ...(state === 'up' ? { boxShadow: '0 0 0 3px rgba(34,197,94,0.25)', animation: `${pulse} 2.2s ease-in-out infinite` } : {}),
            }} />
            {cfg.label}
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

function BeatMockup({ t }) {
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
function EarMockup({ t }) {
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

function BotRow({ bot, liveState, t, flip }) {
    const { accent } = bot;
    return (
        <Card elevation={0} sx={{ position: 'relative', overflow: 'hidden', p: { xs: 3, md: 5 } }}>
            {/* Halos */}
            <Box sx={{
                position: 'absolute', width: 420, height: 420, top: -180, right: flip ? 'auto' : -120, left: flip ? -120 : 'auto',
                pointerEvents: 'none', background: `radial-gradient(circle, ${accent.main}47, transparent 66%)`,
            }} />
            <Box sx={{
                position: 'absolute', width: 300, height: 300, bottom: -160, left: flip ? 'auto' : -80, right: flip ? -80 : 'auto',
                pointerEvents: 'none', background: `radial-gradient(circle, ${accent.second}29, transparent 66%)`,
            }} />

            <Box sx={{
                position: 'relative', display: 'grid', alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
                gap: { xs: 4, md: 6 },
            }}>
                <Box sx={{ order: { xs: 0, md: flip ? 1 : 0 } }}>
                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                        <BotAvatar bot={bot.avatar} size={64} />
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                                <Typography variant="h3" sx={{ fontSize: '1.7rem' }}>{bot.name}</Typography>
                                <LiveChip state={liveState} t={t} />
                            </Stack>
                            <Typography sx={{
                                fontFamily: MONO_FONT, fontSize: '0.75rem', letterSpacing: '0.16em',
                                textTransform: 'uppercase', color: accent.main, mt: 0.4,
                            }}>
                                {bot.role}
                            </Typography>
                        </Box>
                    </Stack>

                    <Typography sx={{ color: 'text.secondary', fontSize: '1rem', lineHeight: 1.6, mt: 2.5 }}>
                        {bot.blurb}
                    </Typography>

                    <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                        {bot.points.map((point) => (
                            <Stack key={point} direction="row" spacing={1.4} alignItems="flex-start">
                                <Box component="span" sx={{ color: accent.main, fontWeight: 800, lineHeight: 1.45, flexShrink: 0 }}>✓</Box>
                                <Typography sx={{ fontSize: '0.92rem', color: '#c9c9d1', lineHeight: 1.45 }}>{point}</Typography>
                            </Stack>
                        ))}
                    </Stack>

                    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 3.25 }}>
                        <Button href={bot.inviteUrl} target="_blank" rel="noopener" sx={{
                            height: 44, px: 2.5, fontSize: '0.95rem', fontWeight: 600, borderRadius: '12px',
                            background: `linear-gradient(120deg, ${accent.main}, ${accent.second})`,
                            color: '#0a0a0a',
                            boxShadow: `0 10px 30px -12px ${accent.main}b3`,
                            transition: 'all 0.18s',
                            '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)' },
                        }}>
                            {t('bots.addToDiscord')}
                        </Button>
                        <Button href={bot.webAppUrl} target="_blank" rel="noopener" sx={GHOST_BTN_SX}>
                            {t('bots.openWebApp')}
                        </Button>
                        <Button component={Link} to={bot.path}
                            sx={{ ...GHOST_BTN_SX, bgcolor: 'transparent', borderColor: 'transparent', color: '#a1a1aa', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'transparent' } }}>
                            {t('bots.details')} →
                        </Button>
                    </Stack>

                    <Typography sx={{ fontSize: '0.78rem', color: '#71717a', mt: 1.75 }}>
                        {t('bots.optnote')} · <Box component="span" sx={{ fontFamily: MONO_FONT, color: accent.main }}>{bot.domain}</Box>
                    </Typography>
                </Box>

                <Box sx={{ order: { xs: 1, md: flip ? 0 : 1 }, minWidth: 0 }}>
                    {bot.mockup}
                </Box>
            </Box>
        </Card>
    );
}

export default function Bots() {
    const { t } = useLanguage();
    const { status } = useLiveStatus();

    const flow = [
        { title: t('bots.flow1Title'), text: t('bots.flow1Text') },
        { title: t('bots.flow2Title'), text: t('bots.flow2Text') },
        { title: t('bots.flow3Title'), text: t('bots.flow3Text') },
    ];

    const bots = [
        {
            name: 'BeatByte', role: t('bots.beatbyte.subtitle'), blurb: t('bots.beatbyte.blurb'),
            points: t('bots.beatbyte.points'),
            accent: ACCENTS.beat, avatar: 'beat', mockup: <BeatMockup t={t} />, live: status.beat.state,
            inviteUrl: BEATBYTE_INVITE, webAppUrl: 'https://beatbyte.bytebots.de', domain: 'beatbyte.bytebots.de',
            path: '/bots/music-bot',
        },
        {
            name: 'EarTastic', role: t('bots.eartastic.subtitle'), blurb: t('bots.eartastic.blurb'),
            points: t('bots.eartastic.points'),
            accent: ACCENTS.ear, avatar: 'ear', mockup: <EarMockup t={t} />, live: status.ear.state,
            inviteUrl: SOUNDBOARD_INVITE, webAppUrl: 'https://soundboard.bytebots.de', domain: 'soundboard.bytebots.de',
            path: '/bots/soundboard-bot',
        },
    ];

    return (
        <Box sx={{ pb: { xs: 8, md: 10 }, position: 'relative', overflow: 'hidden' }}>
            {/* Seiten-Glows */}
            <Box sx={{
                position: 'absolute', width: 640, height: 640, left: -180, top: -220, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(168,85,247,0.22), transparent 62%)',
            }} />
            <Box sx={{
                position: 'absolute', width: 560, height: 560, right: -160, top: 60, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(34,211,238,0.12), transparent 62%)',
            }} />

            <Box sx={{ position: 'relative' }}>
                <PageHead kicker={t('bots.kicker')} title={t('bots.pageTitle')} titleAccent={t('bots.pageTitleAccent')} lead={t('bots.lead')} />

                <Container maxWidth="lg" sx={{ mt: 5 }}>
                    {/* Bot-Produkt-Rows */}
                    <Stack spacing={3.5}>
                        {bots.map((bot, i) => (
                            <BotRow key={bot.name} bot={bot} liveState={bot.live} t={t} flip={i % 2 === 1} />
                        ))}
                    </Stack>

                    {/* 3-Schritte-Flow */}
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.75} alignItems="stretch" sx={{ mt: 3.5 }}>
                        {flow.map((step, i) => (
                            <Card key={i} elevation={0} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.75, px: 2.75, py: 2.5 }}>
                                <Box sx={{
                                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                                    bgcolor: 'rgba(168,85,247,0.14)', border: '1px solid rgba(168,85,247,0.3)',
                                    color: '#c084fc', fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.06rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {i + 1}
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{step.title}</Typography>
                                    <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.55 }}>{step.text}</Typography>
                                </Box>
                            </Card>
                        ))}
                    </Stack>

                    {/* Kommt bald */}
                    <Box sx={{
                        mt: 3.5, p: { xs: 3, md: 4 }, borderRadius: '18px',
                        border: '1px dashed rgba(255,255,255,0.17)', bgcolor: 'rgba(255,255,255,0.015)',
                        display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap',
                    }}>
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 1,
                            fontFamily: MONO_FONT, fontSize: '0.75rem', fontWeight: 600,
                            letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c084fc',
                            bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                            borderRadius: '999px', px: 1.9, py: 0.9, flexShrink: 0,
                        }}>
                            {t('bots.soonBadge')}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            <Typography sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: '1.25rem', color: '#e4e4e7' }}>
                                {t('bots.soonTitle')}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55, mt: 0.5 }}>
                                {t('bots.soonText')}
                            </Typography>
                        </Box>
                        <Button href="mailto:kontakt@bytebots.de"
                            sx={{ ...GHOST_BTN_SX, height: 38, px: 1.9, fontSize: '0.85rem', borderRadius: '10px' }}>
                            {t('bots.suggest')}
                        </Button>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}

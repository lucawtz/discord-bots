import { Box, Typography, Container } from '@mui/material';
import { DISPLAY_FONT, MONO_FONT } from '../theme';
import beatbyteAvatar from '../assets/beatbyte-avatar.png';
import eartasticAvatar from '../assets/eartastic-avatar.png';

export { DISPLAY_FONT, MONO_FONT };

export const BOT_AVATARS = { beat: beatbyteAvatar, ear: eartasticAvatar };

// Bot-Akzentfarben aus dem Redesign: BeatByte violett, EarTastic cyan
export const ACCENTS = {
    beat: { main: '#a855f7', second: '#d946ef', light: '#c084fc' },
    ear: { main: '#22d3ee', second: '#3b82f6', light: '#5fd6e8' },
};

export const GRADIENT_TEXT = {
    background: 'linear-gradient(115deg, #c084fc, #d946ef 52%, #22d3ee)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
};

export const CARD_SX = {
    background: 'linear-gradient(180deg, #141419, #0d0d12)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '18px',
};

export const PRIMARY_BTN_SX = {
    background: 'linear-gradient(120deg, #7c3aed, #d946ef)',
    color: '#fff',
    px: 2.5, height: 44, fontSize: '0.95rem', fontWeight: 600,
    boxShadow: '0 10px 34px -10px rgba(168,85,247,0.7)',
    transition: 'all 0.18s',
    '&:hover': { filter: 'brightness(1.08)', transform: 'translateY(-1px)', boxShadow: '0 12px 38px -10px rgba(168,85,247,0.8)' },
};

export const GHOST_BTN_SX = {
    bgcolor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fafafa',
    px: 2.5, height: 44, fontSize: '0.95rem', fontWeight: 600,
    transition: 'all 0.18s',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: '#a855f7' },
};

export function BrandLogo({ size = 34 }) {
    return (
        <Box component="svg" viewBox="0 0 512 512" fill="none"
            sx={{ width: size, height: size, filter: 'drop-shadow(0 4px 14px rgba(168,85,247,0.5))', flexShrink: 0 }}>
            <defs>
                <radialGradient id="bb-lg1" cx="50%" cy="38%" r="72%">
                    <stop offset="0" stopColor="#271738" />
                    <stop offset="1" stopColor="#0b0b10" />
                </radialGradient>
                <linearGradient id="bb-lb1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#a855f7" />
                    <stop offset="0.52" stopColor="#d946ef" />
                    <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
            </defs>
            <circle cx="256" cy="256" r="248" fill="url(#bb-lg1)" />
            <circle cx="256" cy="256" r="245" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="6" />
            <rect x="214" y="118" width="56" height="256" rx="28" fill="url(#bb-lb1)" transform="rotate(20 242 246)" />
            <rect x="298" y="318" width="52" height="52" rx="13" fill="url(#bb-lb1)" />
        </Box>
    );
}

// Echte Discord-Avatare der Bots, lokal gebundelt (src/assets/) statt Discord-CDN
export function BotAvatar({ bot = 'beat', size = 56, radius = 16, sx = {} }) {
    const accent = ACCENTS[bot];
    const name = bot === 'beat' ? 'BeatByte' : 'EarTastic';
    return (
        <Box component="img" src={BOT_AVATARS[bot]} alt={name}
            sx={{
                width: size, height: size, borderRadius: `${radius}px`,
                flexShrink: 0, display: 'block', objectFit: 'cover',
                border: `1px solid ${accent.main}59`,
                boxShadow: `0 12px 34px -10px ${accent.main}a6`,
                ...sx,
            }} />
    );
}

export function Kicker({ children, sx = {} }) {
    return (
        <Typography component="div" sx={{
            fontFamily: MONO_FONT, fontSize: '0.78rem', letterSpacing: '0.24em',
            textTransform: 'uppercase', color: '#c084fc', ...sx,
        }}>
            {children}
        </Typography>
    );
}

export function GradText({ children }) {
    return <Box component="span" sx={GRADIENT_TEXT}>{children}</Box>;
}

export function PageHead({ kicker, title, titleAccent, lead }) {
    return (
        <Box sx={{ pt: { xs: 6, md: 8 }, pb: 1 }}>
            <Container maxWidth="lg">
                <Kicker>{kicker}</Kicker>
                <Typography variant="h1" sx={{ fontSize: { xs: '2.1rem', md: '2.9rem' }, mt: 1.75 }}>
                    {title}{titleAccent && <> <GradText>{titleAccent}</GradText></>}
                </Typography>
                {lead && (
                    <Typography sx={{ fontSize: '1.1rem', color: 'text.secondary', maxWidth: 600, mt: 2, lineHeight: 1.6 }}>
                        {lead}
                    </Typography>
                )}
            </Container>
        </Box>
    );
}

export function CmdChip({ children, sx = {} }) {
    return (
        <Box component="span" sx={{
            fontFamily: MONO_FONT, fontSize: '0.845rem', fontWeight: 500, color: '#c084fc',
            bgcolor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.24)',
            px: 1.25, py: 0.5, borderRadius: '8px', display: 'inline-block', whiteSpace: 'nowrap', ...sx,
        }}>
            {children}
        </Box>
    );
}

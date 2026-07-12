import { useMemo, useState } from 'react';
import {
    Box, Typography, Container, Stack, InputBase, Card,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHead, CmdChip } from '../components/ui';

const BEATBYTE_COMMANDS = [
    { name: '/play <query>', key: 'play' },
    { name: '/playnow <query>', key: 'playnow' },
    { name: '/skip', key: 'skip' },
    { name: '/pause', key: 'pause' },
    { name: '/stop', key: 'stop' },
    { name: '/queue', key: 'queue' },
    { name: '/nowplaying', key: 'nowplaying' },
    { name: '/clear', key: 'clear' },
    { name: '/remove <pos>', key: 'remove' },
    { name: '/shuffle', key: 'shuffle' },
    { name: '/loop [modus]', key: 'loop' },
    { name: '/seek <zeit>', key: 'seek' },
    { name: '/volume [%]', key: 'volume' },
    { name: '/join', key: 'join' },
    { name: '/lyrics [query]', key: 'lyrics' },
    { name: '/app', key: 'app' },
    { name: '/autodj', key: 'autodj' },
    { name: '/disconnect', key: 'disconnect' },
    { name: '/filter <filter>', key: 'filter' },
    { name: '/move <von> <nach>', key: 'move' },
    { name: '/playlist <action>', key: 'playlist' },
    { name: '/replay', key: 'replay' },
    { name: '/setrole [rolle]', key: 'setrole' },
];

const EARTASTIC_COMMANDS = [
    { name: '/sound <name>', key: 'sound' },
    { name: '/favorite <name>', key: 'favorite' },
    { name: '/soundboard', key: 'soundboard' },
    { name: '/dashboard', key: 'dashboard' },
    { name: '/volume <prozent>', key: 'volume' },
];

const CAT_STYLES = {
    musik: { bg: 'rgba(168,85,247,0.14)', color: '#c084fc' },
    sound: { bg: 'rgba(34,211,238,0.14)', color: '#5fd6e8' },
};

export default function Commands() {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('alle');

    const allCommands = useMemo(() => [
        ...BEATBYTE_COMMANDS.map((c) => ({ ...c, cat: 'musik', desc: t(`commands.beatbyte.${c.key}`), catLabel: t('commands.tagMusic') })),
        ...EARTASTIC_COMMANDS.map((c) => ({ ...c, cat: 'sound', desc: t(`commands.eartastic.${c.key}`), catLabel: t('commands.tagSound') })),
    ], [t]);

    const cats = [
        { id: 'alle', label: t('commands.catAll') },
        { id: 'musik', label: 'Musik · BeatByte' },
        { id: 'sound', label: 'Soundboard · EarTastic' },
    ];

    const q = query.trim().toLowerCase();
    const filtered = allCommands.filter((c) =>
        (cat === 'alle' || c.cat === cat) &&
        (c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
    );

    return (
        <Box sx={{ pb: { xs: 8, md: 10 } }}>
            <PageHead kicker={t('commands.kicker')} title={t('commands.pageTitle')} titleAccent={t('commands.pageTitleAccent')} lead={t('commands.lead')} />

            <Container maxWidth="md" sx={{ mt: 4 }}>
                {/* Suche */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.4, height: 52, px: 2.25,
                    borderRadius: '13px', bgcolor: '#0d0d12', border: '1px solid rgba(255,255,255,0.12)',
                    '&:focus-within': { borderColor: 'rgba(168,85,247,0.5)' },
                }}>
                    <SearchIcon sx={{ fontSize: 20, color: '#71717a' }} />
                    <InputBase value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('commands.searchPlaceholder')}
                        sx={{ flex: 1, color: '#fafafa', fontSize: '0.94rem', '& input::placeholder': { color: '#71717a', opacity: 1 } }} />
                </Box>

                {/* Kategorien */}
                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {cats.map((c) => {
                        const active = cat === c.id;
                        return (
                            <Box key={c.id} component="button" onClick={() => setCat(c.id)} sx={{
                                fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                                px: 1.9, py: 0.9, borderRadius: '9px', cursor: 'pointer',
                                bgcolor: active ? 'rgba(168,85,247,0.16)' : 'rgba(255,255,255,0.05)',
                                border: active ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                color: active ? '#c084fc' : '#a1a1aa',
                                transition: 'all 0.15s',
                                '&:hover': { color: active ? '#c084fc' : '#fafafa' },
                            }}>
                                {c.label}
                            </Box>
                        );
                    })}
                </Stack>

                {/* Command-Liste */}
                <Card elevation={0} sx={{ mt: 2, overflow: 'hidden' }}>
                    {filtered.map((c, i) => {
                        const style = CAT_STYLES[c.cat];
                        return (
                            <Box key={`${c.cat}-${c.name}`} sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '150px 1fr', sm: '220px 1fr 120px' },
                                gap: 2.25, alignItems: 'center', px: 2.5, py: 1.9,
                                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                            }}>
                                <CmdChip sx={{ justifySelf: 'start', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</CmdChip>
                                <Typography sx={{ fontSize: '0.91rem', color: 'text.secondary' }}>{c.desc}</Typography>
                                <Box component="span" sx={{
                                    display: { xs: 'none', sm: 'inline-block' },
                                    fontSize: '0.72rem', fontWeight: 600, px: 1.25, py: 0.4,
                                    borderRadius: '6px', textAlign: 'center', justifySelf: 'start',
                                    bgcolor: style.bg, color: style.color,
                                }}>
                                    {c.catLabel}
                                </Box>
                            </Box>
                        );
                    })}
                    {filtered.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                            <Typography sx={{ fontSize: '1.6rem', mb: 1 }}>🔍</Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                {t('commands.noResults')} „{query}“
                            </Typography>
                        </Box>
                    )}
                </Card>

                <Typography sx={{ fontSize: '0.81rem', color: '#71717a', mt: 1.75 }}>
                    {filtered.length} {t('commands.countLine')}
                </Typography>
            </Container>
        </Box>
    );
}

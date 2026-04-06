import { Box, Typography, Container, Stack, Chip } from '@mui/material';
import { useLanguage } from '../i18n/LanguageContext';

const typeColors = { release: '#a855f7', feature: '#34d399', fix: '#fbbf24' };
const typeLabels = { release: 'Release', feature: 'Feature', fix: 'Fix' };

export default function Changelog() {
    const { t } = useLanguage();

    const entries = [
        {
            date: '2026-04-05',
            version: 'v1.0.0',
            title: t('changelog.initialRelease'),
            type: 'release',
            changes: t('changelog.changes'),
        },
    ];

    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1 }}>
                        {t('changelog.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('changelog.subtitle')}
                    </Typography>
                </Box>

                <Stack spacing={4}>
                    {entries.map((entry, i) => (
                        <Box key={i} sx={{
                            p: 3.5, borderRadius: 3, bgcolor: '#18181b',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                <Chip label={typeLabels[entry.type]} size="small"
                                    sx={{ bgcolor: `${typeColors[entry.type]}15`, color: typeColors[entry.type], fontSize: '0.7rem', height: 22 }} />
                                <Typography variant="caption" color="text.disabled">{entry.version}</Typography>
                                <Typography variant="caption" color="text.disabled">• {entry.date}</Typography>
                            </Stack>
                            <Typography variant="h6" sx={{ mb: 2, fontSize: '1.05rem' }}>{entry.title}</Typography>
                            <Stack spacing={0.75}>
                                {(Array.isArray(entry.changes) ? entry.changes : []).map((c, j) => (
                                    <Typography key={j} variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', pl: 2, position: 'relative',
                                        '&::before': { content: '"•"', position: 'absolute', left: 0, color: '#52525b' } }}>
                                        {c}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

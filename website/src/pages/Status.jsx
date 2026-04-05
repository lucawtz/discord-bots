import { Box, Typography, Container, Stack, Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const services = [
    { name: 'BeatByte', subtitle: 'Music Bot', status: 'operational' },
    { name: 'EarTastic', subtitle: 'Soundboard Bot', status: 'operational' },
    { name: 'Web Player', subtitle: 'app.bytebots.de', status: 'operational' },
    { name: 'Soundboard Dashboard', subtitle: 'soundboard.bytebots.de', status: 'operational' },
    { name: 'API Server', subtitle: 'Port 3001', status: 'operational' },
];

const statusColors = { operational: '#34d399', degraded: '#fbbf24', down: '#f87171' };
const statusLabels = { operational: 'Operational', degraded: 'Degraded', down: 'Down' };

export default function Status() {
    return (
        <Box sx={{ py: 10, px: 3 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, mb: 1 }}>
                        Status
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <FiberManualRecordIcon sx={{ fontSize: 12, color: '#34d399' }} />
                        <Typography variant="body2" color="text.secondary">Alle Systeme laufen normal</Typography>
                    </Stack>
                </Box>

                <Stack spacing={1.5}>
                    {services.map((s, i) => (
                        <Box key={i} sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 2.5, borderRadius: 2.5, bgcolor: '#18181b',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <Box>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</Typography>
                                <Typography variant="caption" color="text.disabled">{s.subtitle}</Typography>
                            </Box>
                            <Chip
                                icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: `${statusColors[s.status]} !important` }} />}
                                label={statusLabels[s.status]}
                                size="small"
                                sx={{ bgcolor: 'rgba(52,211,153,0.08)', color: statusColors[s.status], fontSize: '0.75rem' }}
                            />
                        </Box>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

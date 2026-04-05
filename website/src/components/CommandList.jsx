import { Box, Typography, Stack } from '@mui/material';

export default function CommandList({ commands, accentColor = '#a855f7' }) {
    return (
        <Stack spacing={1}>
            {commands.map((cmd) => (
                <Box key={cmd.name} sx={{
                    display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 0.5, sm: 2 },
                    p: 2, bgcolor: '#18181b', borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'border-color 0.15s',
                    '&:hover': { borderColor: 'rgba(168,85,247,0.15)' },
                }}>
                    <Typography sx={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.825rem',
                        fontWeight: 600, color: accentColor, whiteSpace: 'nowrap', minWidth: 170,
                    }}>
                        {cmd.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        {cmd.description}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

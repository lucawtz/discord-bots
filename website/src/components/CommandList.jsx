import { Box, Typography, Stack } from '@mui/material';

export default function CommandList({ commands, accentColor = '#08fcfe' }) {
    return (
        <Stack spacing={1.5}>
            {commands.map((cmd) => (
                <Box
                    key={cmd.name}
                    sx={{
                        display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.5, sm: 2 },
                        p: 2, bgcolor: 'background.paper',
                        border: '1px solid', borderColor: 'divider', borderRadius: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.08)', bgcolor: '#22222f' },
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: '0.875rem', fontWeight: 600, color: accentColor,
                            whiteSpace: 'nowrap', minWidth: 180,
                        }}
                    >
                        {cmd.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {cmd.description}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

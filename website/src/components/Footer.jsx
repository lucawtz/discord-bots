import { Box, Typography, Link as MuiLink, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                py: 5, px: 3, mt: 'auto',
                borderTop: '1px solid', borderColor: 'divider',
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'center', sm: 'flex-start' }}
                spacing={3}
                sx={{ maxWidth: 1200, mx: 'auto' }}
            >
                <Typography variant="body2" color="text.disabled">
                    &copy; {new Date().getFullYear()} ByteBots
                </Typography>
                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                    <MuiLink component={Link} to="/" color="text.disabled" underline="hover" variant="body2"
                        sx={{ '&:hover': { color: 'text.secondary' } }}>
                        Home
                    </MuiLink>
                    <MuiLink component={Link} to="/bots/music-bot" color="text.disabled" underline="hover" variant="body2"
                        sx={{ '&:hover': { color: 'text.secondary' } }}>
                        BeatByte
                    </MuiLink>
                    <MuiLink component={Link} to="/bots/soundboard-bot" color="text.disabled" underline="hover" variant="body2"
                        sx={{ '&:hover': { color: 'text.secondary' } }}>
                        Soundboard
                    </MuiLink>
                    <MuiLink component={Link} to="/impressum" color="text.disabled" underline="hover" variant="body2"
                        sx={{ '&:hover': { color: 'text.secondary' } }}>
                        Impressum
                    </MuiLink>
                    <MuiLink component={Link} to="/datenschutz" color="text.disabled" underline="hover" variant="body2"
                        sx={{ '&:hover': { color: 'text.secondary' } }}>
                        Datenschutz
                    </MuiLink>
                </Stack>
            </Stack>
        </Box>
    );
}

// Bot invite links (OAuth2 with required permissions)
// Music Bot: Connect, Speak, Use Voice Activity, Send Messages, Embed Links, Use Slash Commands
export const BEATBYTE_INVITE = 'https://discord.com/oauth2/authorize?client_id=1488919318472298647&permissions=3147776&scope=bot%20applications.commands';

// Soundboard Bot: Connect, Speak, Use Voice Activity, Send Messages, Embed Links, Attach Files, Use Slash Commands
export const SOUNDBOARD_INVITE = 'https://discord.com/oauth2/authorize?client_id=1488966705488330932&permissions=3214336&scope=bot%20applications.commands';

// Music Bot API
export const API_BASE = import.meta.env.VITE_API_URL || 'https://api.bytebots.de';
export const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://api.bytebots.de';

// Discord OAuth2 (gleiche Application wie Music Bot)
export const DISCORD_CLIENT_ID = '1489420168957394984';
export const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT || `${window.location.origin}/`;
export const DISCORD_LOGIN_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=identify`;

# Discord Bots

A collection of Discord bots running on Oracle Cloud.

## Bots

| Bot | Description | Status |
|-----|-------------|--------|
| [Music Bot](bots/music-bot) | Discord music bot with YouTube playback via yt-dlp | Active |
| [Soundboard Bot](bots/soundboard-bot) | Discord soundboard with interactive panels and sound upload | Active |

## Dashboard

Web-based management dashboard for monitoring and controlling all bots.

- View bot status, uptime, and memory usage
- Start, stop, and restart bots
- View live logs

## Setup

Each bot has its own `package.json` and `.env.example`. To set up a bot:

```bash
cd bots/<bot-name>
cp .env.example .env     # Fill in your tokens
npm install
npm start
```

## Hosting

All bots are hosted on an Oracle Cloud VM (Always Free Tier) and managed via systemd services.

# Discord Bots

A collection of Discord bots running on Coolify.

## Bots

| Bot | Description | Status |
|-----|-------------|--------|
| [Music Bot](bots/music-bot) | Discord music bot with YouTube playback via yt-dlp | Active |
| [Soundboard Bot](bots/soundboard-bot) | Discord soundboard with interactive panels and sound upload | Active |

## Setup

Each bot has its own `package.json` and `.env.example`. To set up a bot:

```bash
cd bots/<bot-name>
cp .env.example .env     # Fill in your tokens
npm install
npm start
```

## Hosting

All bots are hosted via Coolify, each service running in its own Docker container.

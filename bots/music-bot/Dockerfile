# syntax=docker/dockerfile:1
# Build-Kontext = Repo-Root  (in Coolify: Base Directory "/")
# Dockerfile Location in Coolify: /bots/music-bot/Dockerfile

# ── 1) Web-Frontend (React/Vite, Tauri-App) bauen -> app/dist ──
#    Die api.js serviert statische Dateien aus  ../app/dist
FROM node:22-bookworm-slim AS appbuild
WORKDIR /repo/bots/music-bot/app
COPY bots/music-bot/app/package.json bots/music-bot/app/package-lock.json ./
# installiert auch devDeps (vite) — @tauri-apps/cli wird mitgezogen, für den
# reinen Web-Build unnötig; falls es je Probleme macht, aus devDependencies nehmen.
RUN npm ci
COPY bots/music-bot/app/ ./
RUN npm run build

# ── 2) Laufzeit: Discord-Bot + API (Port 3001) ────────────────
FROM node:22-bookworm-slim
# ffmpeg + python3 als robuste Basis für yt-dlp/Audio (youtube-dl-exec & @ffmpeg-installer
# bringen zwar eigene Binaries mit, das hier ist die Absicherung auf PATH)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /repo

# Gemeinsame Libs — require('../../../libs/rateLimiter')
COPY libs ./libs

# Dependencies (postinstall lädt yt-dlp/ffmpeg-Binaries)
COPY bots/music-bot/package.json bots/music-bot/package-lock.json ./bots/music-bot/
RUN cd bots/music-bot && npm ci --omit=dev

# Quellcode + gebautes Frontend
COPY bots/music-bot/src ./bots/music-bot/src
COPY --from=appbuild /repo/bots/music-bot/app/dist ./bots/music-bot/app/dist

WORKDIR /repo/bots/music-bot
# DB liegt in ./data/music.db, optionale ./cookies.txt  ->  Persistent Storage:
#   Container-Pfad: /repo/bots/music-bot/data
EXPOSE 3001
CMD ["node", "src/index.js"]

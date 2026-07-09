# syntax=docker/dockerfile:1
# Build-Kontext = Repo-Root  (in Coolify: Base Directory "/")
# Dockerfile Location in Coolify: /bots/soundboard-bot/Dockerfile
# ffmpeg kommt gebündelt über npm-Paket "ffmpeg-static" (kein apt nötig).

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3002
WORKDIR /repo

# Gemeinsame Libs — der Bot macht require('../../../libs/rateLimiter')
COPY libs ./libs

# Dependencies (eigene package-lock.json vorhanden)
COPY bots/soundboard-bot/package.json bots/soundboard-bot/package-lock.json ./bots/soundboard-bot/
RUN cd bots/soundboard-bot && npm ci --omit=dev

# Quellcode
COPY bots/soundboard-bot/src ./bots/soundboard-bot/src

WORKDIR /repo/bots/soundboard-bot
# DB + Sounds liegen in ./data/soundboard.db  ->  in Coolify als Persistent Storage mounten:
#   Container-Pfad: /repo/bots/soundboard-bot/data
EXPOSE 3002
CMD ["node", "src/index.js"]

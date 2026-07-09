# syntax=docker/dockerfile:1
# Build-Kontext = Repo-Root  (in Coolify: Base Directory "/")
# Dockerfile Location in Coolify: /website/Dockerfile

# ── 1) Vite-Build (React/MUI) -> website/dist ─────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /repo/website
COPY website/package.json website/package-lock.json ./
RUN npm ci
COPY website/ ./
RUN npm run build

# ── 2) Laufzeit: Express serviert dist/ ───────────────────────
FROM node:22-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3003
WORKDIR /repo/website
COPY website/package.json website/package-lock.json ./
RUN npm ci --omit=dev
COPY website/server.js ./server.js
COPY --from=build /repo/website/dist ./dist
EXPOSE 3003
CMD ["node", "server.js"]

#!/bin/sh
# Deploy auf den Hetzner-Server (ersetzt Coolify seit 2026-09-13).
#
#   scripts/deploy.sh <music-bot|soundboard-bot|website|all>
#
# Holt origin/prod in den Server-Checkout (/opt/bytebots/repo), baut das
# Image dort und startet NUR den genannten Service neu. Push != Deploy bleibt:
# erst pushen, dann dieses Skript. "all" baut nacheinander (1 vCPU / 1,9 GB RAM).
# Secrets liegen ausschliesslich auf dem Server in /opt/bytebots/env (chmod 600).
set -eu

HOST="${DEPLOY_HOST:-root@167.233.237.112}"

case "${1:-}" in
    music-bot|soundboard-bot|website) TARGETS="$1" ;;
    all) TARGETS="music-bot soundboard-bot website" ;;
    *) echo "Usage: $0 <music-bot|soundboard-bot|website|all>" >&2; exit 1 ;;
esac

ssh "$HOST" "set -eu
cd /opt/bytebots/repo
git fetch --quiet origin prod
git reset --hard --quiet origin/prod
echo \"Deploy \$(git rev-parse --short HEAD): $TARGETS\"
cd deploy
for s in $TARGETS; do
    docker compose build \"\$s\"
    docker compose up -d \"\$s\"
done
docker compose ps"

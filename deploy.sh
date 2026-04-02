#!/bin/bash
# Deploy-Script für discord-bots Monorepo
# Verwendung: ssh auf Server, dann: cd ~/discord-bots && bash deploy.sh

set -e

REPO_DIR="$HOME/discord-bots"
OLD_REPO_DIR="$HOME/Discord-Music-Bot"
USER_NAME="ubuntu"

echo "=== Discord Bots Deploy ==="

# ── 1. Repo klonen oder pullen ────────────────────────────────
if [ ! -d "$REPO_DIR" ]; then
    echo ">> Klone Monorepo..."
    git clone https://github.com/lucawtz/discord-bots.git "$REPO_DIR"
    cd "$REPO_DIR"
else
    echo ">> Pullen..."
    cd "$REPO_DIR"
    git pull
fi

# ── 2. Dependencies installieren ─────────────────────────────
echo ">> Music Bot: npm install..."
cd "$REPO_DIR/bots/music-bot"
npm install --production

echo ">> Soundboard Bot: npm install..."
cd "$REPO_DIR/bots/soundboard-bot"
npm install --production

# ── 3. Music Web App bauen ───────────────────────────────────
echo ">> Music App: npm install + build..."
cd "$REPO_DIR/bots/music-bot/app"
npm install
node node_modules/vite/bin/vite.js build

# ── 4. .env Dateien kopieren (falls alte vorhanden) ──────────
if [ -d "$OLD_REPO_DIR" ]; then
    echo ">> .env aus altem Repo uebernehmen..."
    [ -f "$OLD_REPO_DIR/.env" ] && cp "$OLD_REPO_DIR/.env" "$REPO_DIR/bots/music-bot/.env" 2>/dev/null || true
fi

# ── 5. Systemd Services aktualisieren ────────────────────────
echo ">> Systemd Services installieren..."
sudo cp "$REPO_DIR/services/discord-bot.service" /etc/systemd/system/discord-bot.service
sudo cp "$REPO_DIR/services/soundboard-bot.service" /etc/systemd/system/soundboard-bot.service
sudo cp "$REPO_DIR/services/dashboard.service" /etc/systemd/system/dashboard.service
sudo systemctl daemon-reload

# ── 6. Slash Commands registrieren ───────────────────────────
echo ">> Slash Commands registrieren..."
cd "$REPO_DIR/bots/music-bot"
node src/deploy-commands.js

# ── 7. Services neu starten ──────────────────────────────────
echo ">> Services neu starten..."
sudo systemctl restart discord-bot
sudo systemctl restart soundboard-bot
sudo systemctl restart dashboard

sudo systemctl enable discord-bot
sudo systemctl enable soundboard-bot
sudo systemctl enable dashboard

# ── 8. Status pruefen ────────────────────────────────────────
echo ""
echo "=== Status ==="
sudo systemctl status discord-bot --no-pager -l | head -5
echo "---"
sudo systemctl status soundboard-bot --no-pager -l | head -5
echo "---"
sudo systemctl status dashboard --no-pager -l | head -5
echo ""
echo "=== Deploy abgeschlossen ==="

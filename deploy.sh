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

echo ">> Dashboard: npm install..."
cd "$REPO_DIR/dashboard"
npm install --production

# ── 3. Music Web App bauen ───────────────────────────────────
echo ">> Music App: npm install + build..."
cd "$REPO_DIR/bots/music-bot/app"
npm install
node node_modules/vite/bin/vite.js build

# ── 4. .env Dateien pruefen ─────────────────────────────────
# Alte .env uebernehmen (Migration)
if [ -d "$OLD_REPO_DIR" ]; then
    echo ">> .env aus altem Repo uebernehmen..."
    [ -f "$OLD_REPO_DIR/.env" ] && cp -n "$OLD_REPO_DIR/.env" "$REPO_DIR/bots/music-bot/.env" 2>/dev/null || true
fi

# Pruefen ob alle .env Dateien existieren
MISSING_ENV=0
for ENV_PATH in "$REPO_DIR/bots/music-bot/.env" "$REPO_DIR/bots/soundboard-bot/.env" "$REPO_DIR/dashboard/.env"; do
    if [ ! -f "$ENV_PATH" ]; then
        echo "!! FEHLT: $ENV_PATH (siehe .env.example im gleichen Ordner)"
        MISSING_ENV=1
    fi
done
if [ "$MISSING_ENV" -eq 1 ]; then
    echo ""
    echo "!! .env Dateien fehlen. Erstelle sie vor dem naechsten Neustart."
    echo "!! API Key generieren: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
fi

# ── 5. Systemd Services aktualisieren ────────────────────────
echo ">> Systemd Services installieren..."
sudo cp "$REPO_DIR/services/discord-bot.service" /etc/systemd/system/discord-bot.service
sudo cp "$REPO_DIR/services/soundboard-bot.service" /etc/systemd/system/soundboard-bot.service
sudo cp "$REPO_DIR/services/dashboard.service" /etc/systemd/system/dashboard.service
sudo systemctl daemon-reload

# ── 5b. Nginx Config installieren ───────────────────────────
if [ -f "$REPO_DIR/nginx/bytebots.conf" ]; then
    echo ">> Nginx Config installieren..."
    sudo apt install -y nginx 2>/dev/null || true
    sudo cp "$REPO_DIR/nginx/bytebots.conf" /etc/nginx/sites-available/bytebots
    sudo ln -sf /etc/nginx/sites-available/bytebots /etc/nginx/sites-enabled/bytebots
    sudo rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/beatbyte
    sudo nginx -t && sudo systemctl reload nginx
    echo ">> Nginx konfiguriert fuer bytebots.de"
fi

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

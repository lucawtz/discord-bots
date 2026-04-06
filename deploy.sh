#!/bin/bash
# Deploy-Script für discord-bots Monorepo
# Verwendung: ssh auf Server, dann: cd ~/discord-bots && bash deploy.sh

set -e

REPO_DIR="$HOME/discord-bots"
OLD_REPO_DIR="$HOME/Discord-Music-Bot"

echo "=== Discord Bots Deploy ==="
echo ">> $(date)"

# ── 1. Repo klonen oder pullen ────────────────────────────────
if [ ! -d "$REPO_DIR" ]; then
    echo ">> Klone Monorepo..."
    git clone https://github.com/lucawtz/discord-bots.git "$REPO_DIR"
    cd "$REPO_DIR"
else
    echo ">> Pullen..."
    cd "$REPO_DIR"
    # Lokale Aenderungen verwerfen (Runtime-Daten sind in .gitignore)
    git fetch origin
    git reset --hard origin/main
    git clean -fd --exclude='.env' --exclude='*.db' --exclude='data/' --exclude='sounds/' --exclude='cookies.txt'
fi

COMMIT=$(git rev-parse --short HEAD)
echo ">> Deploying commit: $COMMIT"

# ── 2. Dependencies installieren ─────────────────────────────
echo ">> Root: npm install..."
cd "$REPO_DIR"
npm install --production

echo ">> Music Bot: npm install..."
cd "$REPO_DIR/bots/music-bot"
npm install --production

echo ">> Soundboard Bot: npm install..."
cd "$REPO_DIR/bots/soundboard-bot"
npm install --production

echo ">> Dashboard: npm install..."
cd "$REPO_DIR/dashboard"
npm install --production

echo ">> Website: npm install..."
cd "$REPO_DIR/website"
npm install

# ── 3. Frontend Apps bauen ───────────────────────────────────
echo ">> Website: build..."
cd "$REPO_DIR/website"
node node_modules/vite/bin/vite.js build

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

# Production Overrides automatisch in .env eintragen
apply_env_overrides() {
    local ENV_FILE="$1"
    local PROD_FILE="$2"
    if [ ! -f "$PROD_FILE" ] || [ ! -f "$ENV_FILE" ]; then return; fi
    echo ">> Production Overrides anwenden: $(basename $(dirname $ENV_FILE))"
    while IFS='=' read -r key value; do
        # Kommentare und leere Zeilen ueberspringen
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        if grep -q "^${key}=" "$ENV_FILE"; then
            # Existiert schon -> updaten
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            # Fehlt -> hinzufuegen
            echo "${key}=${value}" >> "$ENV_FILE"
        fi
        echo "   $key=$value"
    done < "$PROD_FILE"
}

apply_env_overrides "$REPO_DIR/bots/music-bot/.env" "$REPO_DIR/bots/music-bot/.env.production"
apply_env_overrides "$REPO_DIR/bots/soundboard-bot/.env" "$REPO_DIR/bots/soundboard-bot/.env.production" 2>/dev/null
apply_env_overrides "$REPO_DIR/dashboard/.env" "$REPO_DIR/dashboard/.env.production" 2>/dev/null

# ── 5. Systemd Services aktualisieren ────────────────────────
echo ">> Systemd Services installieren..."
sudo cp "$REPO_DIR/services/discord-bot.service" /etc/systemd/system/discord-bot.service
sudo cp "$REPO_DIR/services/soundboard-bot.service" /etc/systemd/system/soundboard-bot.service
sudo cp "$REPO_DIR/services/dashboard.service" /etc/systemd/system/dashboard.service
sudo cp "$REPO_DIR/services/website.service" /etc/systemd/system/website.service
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
FAILED_SERVICES=""

for SERVICE in discord-bot soundboard-bot dashboard website; do
    sudo systemctl enable "$SERVICE"
    sudo systemctl restart "$SERVICE"
    sleep 2
    if ! sudo systemctl is-active --quiet "$SERVICE"; then
        echo "!! FEHLER: $SERVICE ist nicht gestartet!"
        sudo journalctl -u "$SERVICE" --no-pager -n 10
        FAILED_SERVICES="$FAILED_SERVICES $SERVICE"
    fi
done

# ── 8. Status pruefen ────────────────────────────────────────
echo ""
echo "=== Status ==="
for SERVICE in discord-bot soundboard-bot dashboard website; do
    STATUS=$(sudo systemctl is-active "$SERVICE" 2>/dev/null || echo "inactive")
    echo "$SERVICE: $STATUS"
done
echo ""

# Nur discord-bot (Music Bot) ist kritisch — andere sind optional
CRITICAL_FAILED=""
for svc in $FAILED_SERVICES; do
    if [ "$svc" = "discord-bot" ]; then CRITICAL_FAILED="$svc"; fi
done

if [ -n "$FAILED_SERVICES" ]; then
    echo "!! WARNUNG: Folgende Services sind fehlgeschlagen:$FAILED_SERVICES"
fi

if [ -n "$CRITICAL_FAILED" ]; then
    echo "!! KRITISCH: discord-bot ist nicht gestartet!"
    exit 1
fi

echo "=== Deploy $COMMIT abgeschlossen ==="

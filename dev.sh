#!/bin/bash
# Lokales Dev-Startskript fuer discord-bots
# Verwendung: bash dev.sh [music|soundboard|dashboard|all]
#
# WICHTIG: Erstelle zuerst Test-Bots im Discord Developer Portal
# und trage die Tokens in die lokalen .env Dateien ein.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE="${1:-all}"

start_music() {
    echo ">> Music Bot starten (lokal)..."
    cd "$SCRIPT_DIR/bots/music-bot"
    if [ ! -f .env ]; then
        echo "!! .env fehlt in bots/music-bot/ - kopiere .env.example und trage deine Dev-Bot Tokens ein"
        exit 1
    fi
    npm start
}

start_soundboard() {
    echo ">> Soundboard Bot starten (lokal)..."
    cd "$SCRIPT_DIR/bots/soundboard-bot"
    if [ ! -f .env ]; then
        echo "!! .env fehlt in bots/soundboard-bot/ - kopiere .env.example und trage deine Dev-Bot Tokens ein"
        exit 1
    fi
    npm start
}

start_dashboard() {
    echo ">> Dashboard starten (lokal)..."
    cd "$SCRIPT_DIR/dashboard"
    if [ ! -f .env ]; then
        echo "!! .env fehlt in dashboard/ - kopiere .env.example und trage deine Daten ein"
        exit 1
    fi
    npm start
}

case "$SERVICE" in
    music)
        start_music
        ;;
    soundboard)
        start_soundboard
        ;;
    dashboard)
        start_dashboard
        ;;
    all)
        echo "=== Alle Services lokal starten ==="
        echo "Tipp: Starte jeden Service einzeln in separaten Terminals:"
        echo "  bash dev.sh music"
        echo "  bash dev.sh soundboard"
        echo "  bash dev.sh dashboard"
        echo ""
        echo "Oder starte einen einzelnen Bot zum Testen."
        ;;
    *)
        echo "Verwendung: bash dev.sh [music|soundboard|dashboard|all]"
        echo ""
        echo "Beispiele:"
        echo "  bash dev.sh music       - Nur Music Bot starten"
        echo "  bash dev.sh soundboard  - Nur Soundboard Bot starten"
        echo "  bash dev.sh dashboard   - Nur Dashboard starten"
        exit 1
        ;;
esac

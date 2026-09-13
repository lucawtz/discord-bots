#!/bin/sh
# Einmal-Setup auf dem Raspberry Pi Zero W (pi-hole, 192.168.178.42) als Nutzer mit sudo.
#
#   sh setup-pi.sh key       # 1) Nutzer yttunnel + Schluessel anlegen, gibt den Public Key aus
#   sh setup-pi.sh install   # 3) known_hosts + systemd-Dienst installieren und starten
#
# Dazwischen (Schritt 2) auf dem Server: setup-server.sh "<Public Key>".
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
# ed25519-Hostkey des Hetzner-Servers (2026-09-13 ueber eine authentifizierte Verbindung gelesen)
SERVER_HOSTKEY='167.233.237.112 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA5kndTntJKSLH9fsyFjfZd5fwNgUD+zGjwlJ2eA3VEZ'

case "${1:-}" in
    key)
        id yttunnel >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir /var/lib/yttunnel --shell /usr/sbin/nologin yttunnel
        sudo -u yttunnel mkdir -p -m 700 /var/lib/yttunnel/.ssh
        [ -f /var/lib/yttunnel/.ssh/id_ed25519 ] || sudo -u yttunnel ssh-keygen -q -t ed25519 -N '' -C yttunnel@pi-hole -f /var/lib/yttunnel/.ssh/id_ed25519
        sudo cat /var/lib/yttunnel/.ssh/id_ed25519.pub
        ;;
    install)
        echo "$SERVER_HOSTKEY" | sudo -u yttunnel tee /var/lib/yttunnel/.ssh/known_hosts >/dev/null
        sudo install -m 644 "$DIR/yt-tunnel.service" /etc/systemd/system/yt-tunnel.service
        sudo systemctl daemon-reload
        sudo systemctl enable --now yt-tunnel
        systemctl --no-pager --lines=5 status yt-tunnel || true
        ;;
    *)
        echo "Usage: $0 key|install" >&2
        exit 1
        ;;
esac

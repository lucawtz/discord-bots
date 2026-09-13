#!/bin/sh
# Einmal-Setup auf dem Hetzner-Server (als root): Tunnel-Nutzer ytproxy + sshd-Haertung.
#
#   sh /opt/bytebots/repo/deploy/yt-tunnel/setup-server.sh "ssh-ed25519 AAAA... yttunnel@pi-hole"
#
# Den Public Key liefert vorher `sh setup-pi.sh key` auf dem Pi.
# WICHTIG: eine zweite SSH-Sitzung offen lassen, bis der Login-Test unten gruen ist.
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
PUBKEY="${1:?Public Key des Pi als Argument angeben}"

id ytproxy >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/ytproxy --shell /usr/sbin/nologin ytproxy
install -d -m 700 -o ytproxy -g ytproxy /var/lib/ytproxy/.ssh
printf 'restrict,port-forwarding,permitlisten="10.0.0.1:1080" %s\n' "$PUBKEY" > /var/lib/ytproxy/.ssh/authorized_keys
chown ytproxy:ytproxy /var/lib/ytproxy/.ssh/authorized_keys
chmod 600 /var/lib/ytproxy/.ssh/authorized_keys

install -m 644 "$DIR/sshd-bytebots.conf" /etc/ssh/sshd_config.d/10-bytebots.conf
sshd -t
systemctl reload ssh

echo "--- global (erwartet: passwordauthentication no, permitrootlogin without-password)"
sshd -T | grep -Ei '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
echo "--- fuer ytproxy (erwartet: allowtcpforwarding remote, gatewayports clientspecified, permitlisten 10.0.0.1:1080)"
sshd -T -C user=ytproxy,host=pi,addr=192.0.2.1 | grep -Ei '^(allowtcpforwarding|gatewayports|permitlisten|permittty) '

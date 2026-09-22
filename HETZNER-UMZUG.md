# Server-Umzug zu Hetzner

> **Notiz (07.07.2026):** Entscheidung getroffen, einen eigenen **Hetzner-Server zu mieten**
> und die Discord-Bots von Oracle Cloud dorthin umzuziehen. Setup ist an dieser Stelle
> pausiert — unten der Stand + die nächsten Schritte zum Weitermachen.

## Warum der Umzug
- Die Bots liefen auf einer **Oracle-Cloud-VM** (Free Tier / Trial).
- Der Oracle **Free-Trial endete am 01.06.2026** → alle Nicht-Always-Free-Ressourcen wurden zurückgezogen (reclaimed).
- Ergebnis: alle `bytebots.de`-Subdomains liefern **HTTP 522** (Cloudflare erreicht den Origin nicht mehr) → **Bots aktuell offline**.

## Gemieteter Server
| | |
|---|---|
| Anbieter | Hetzner Cloud |
| Typ | **CX23** (Cost-Optimized, Shared, x86 Intel/AMD) |
| Specs | 2 vCPU · 4 GB RAM · 40 GB SSD · 20 TB Traffic |
| Standort | Falkenstein (DE) |
| Image | Ubuntu 26.04 LTS |
| Backups | aktiviert |
| Preis | ~6,53 €/Monat (inkl. Backups) |
| SSH-Key | hinterlegt (`id_ed25519`) |
| **Server-IP** | _(hier eintragen, sobald erstellt)_ |

## Status / wo wir aufgehört haben
- [x] Server in der Hetzner-Konsole konfiguriert
- [ ] Server erstellt („Kostenpflichtig erstellen") + IP notiert
- [ ] Erstes Login + System-Update
- [ ] `ubuntu`-User angelegt
- [ ] Abhängigkeiten installiert (Node, ffmpeg, yt-dlp, git, nginx)
- [ ] Repo geklont + Secrets/Runtime-Daten
- [ ] nginx-Zertifikat erstellt
- [ ] `deploy.sh` ausgeführt
- [ ] Cloudflare-DNS umgebogen
- [ ] Geprüft + Monitoring (Uptime Kuma)

## Nächste Schritte (Runbook zum Weitermachen)

### 1. Erstes Login (PowerShell auf dem PC)
```powershell
ssh root@<SERVER-IP>
```
```bash
apt update && apt upgrade -y
```

### 2. ⚠️ `ubuntu`-User anlegen (kritisch — Services laufen als `User=ubuntu`)
```bash
adduser ubuntu                # Passwort setzen
usermod -aG sudo ubuntu
rsync --archive --chown=ubuntu:ubuntu ~/.ssh /home/ubuntu
echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu
```
Danach neu einloggen: `ssh ubuntu@<SERVER-IP>`

### 3. Firewall
```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

### 4. Abhängigkeiten
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential git ffmpeg python3 python3-pip nginx
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 5. Repo klonen + Secrets
```bash
cd ~ && git clone https://github.com/lucawtz/discord-bots.git && cd discord-bots
```
- Falls das Repo **privat** ist → GitHub-Token (PAT) oder Deploy-Key nötig.
- **Runtime-Daten** (nicht im Git): `.env` (je Bot), `*.db`, `sounds/`, `cookies.txt`
  → von der Oracle-VM kopieren (falls noch erreichbar) **oder** neu anlegen
  (`.env` aus `.env.example`; API-Key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

### 6. nginx-Zertifikat (Cloudflare „Full")
```bash
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/ssl/private/bytebots.key \
  -out /etc/ssl/certs/bytebots.crt -subj "/CN=bytebots.de"
```

### 7. Deploy ausführen
```bash
cd ~/discord-bots && bash deploy.sh
```

### 8. Cloudflare-DNS umbiegen
A-/AAAA-Records für `bytebots.de`, `www`, `app`, `dashboard`, `soundboard`
→ auf die **neue Hetzner-IP**. Proxy (orange Wolke) an, SSL-Modus **Full**.

### 9. Prüfen + Monitoring
```bash
systemctl status discord-bot soundboard-bot dashboard website
```
- Bot online in Discord? · <https://app.bytebots.de/status> erreichbar?
- **Uptime Kuma** aufsetzen → Ausfall-Alerts per Discord (dann nie wieder unbemerkt offline).

## Ausblick: Fotobox
Der Server soll später auch das **Backend der geplanten Fotobox** tragen (eigene
Raspberry-Pi-App, versendbare Miet-Box): Event-Galerien, QR-Download, Foto-Versand,
Live-Slideshow, Flotten-Status/Fernwartung der Boxen. **MVP** = Galerie + QR-Download +
E-Mail-Versand als weitere Node-App im Monorepo (Muster wie `bots/music-bot/src/api.js`:
`x-api-key`-Auth, Rate-Limiter, WebSocket-Broadcast). Fotos später in Cloudflare R2.

---
_Angelegt von Claude Code am 07.07.2026 als Wiederaufnahme-Punkt._

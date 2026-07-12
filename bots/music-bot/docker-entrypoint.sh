#!/bin/sh
# yt-dlp beim Container-Start aktualisieren: die pip-Installation kann sich
# nicht selbst updaten (yt-dlp -U verweigert das), Prod liefe sonst dauerhaft
# mit dem Stand des letzten Docker-Builds — und YouTube bricht alte Versionen
# regelmaessig. Fehler werden toleriert, damit der Bot auch offline startet.
echo "Entrypoint: aktualisiere yt-dlp + POT-Plugin..."
pip3 install --no-cache-dir --break-system-packages -U yt-dlp bgutil-ytdlp-pot-provider \
    || echo "Entrypoint: Update fehlgeschlagen (offline?) — starte mit vorhandener Version"

exec node src/index.js

// Zentrale ByteBots-Links — von beiden Bots (Commands) genutzt.
// Wird wie die uebrigen libs/-Dateien von den Bot-Dockerfiles mitkopiert;
// Require-Pfad aus src/commands/: ../../../../libs/links
// (Die Website hat ihre eigene Kopie in website/src/config.js — separate Deploy-Einheit.)
module.exports = {
    WEBSITE: 'https://bytebots.de',
    // ByteBots Support-Server (Community-Server fuer beide Bots)
    SUPPORT_INVITE: 'https://discord.gg/F5UdSh5NnY',
    // OAuth2-Invites mit den noetigen Bot-Rechten (identisch zu website/src/config.js)
    BEATBYTE_INVITE: 'https://discord.com/oauth2/authorize?client_id=1488919318472298647&permissions=3147776&scope=bot%20applications.commands',
    EARTASTIC_INVITE: 'https://discord.com/oauth2/authorize?client_id=1488966705488330932&permissions=3214336&scope=bot%20applications.commands',
    // ByteBots Admin (kuenftiger Verwaltungs-/Moderations-Bot, aktuell noch ohne Nutzer-Features).
    // Minimale Rechte (View Channels) — beim Feature-Ausbau spaeter erhoehen.
    ADMIN_INVITE: 'https://discord.com/oauth2/authorize?client_id=1525999463615827999&permissions=1024&scope=bot%20applications.commands',
};

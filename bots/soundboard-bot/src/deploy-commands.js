const path = require('path');
const { deployCommands } = require('../../../libs/deploy-commands');

// EarTastic-Commands sind GLOBAL (auf allen Servern sichtbar). Der Scope wird
// bewusst NICHT ueber GUILD_ID gesteuert — das ist zur Laufzeit fuers Dashboard-
// Login (web/auth.js) immer gesetzt — sondern ueber COMMANDS_GUILD_ID: nur lokal
// in der .env.local gesetzt (Dev-Guild -> Commands sofort sichtbar), in Prod/
// Coolify UNGESETZT -> global. Siehe CLAUDE.md (Deployment) / CHANGELOG.
deployCommands(path.join(__dirname, 'commands'), 'Soundboard', 'SOUNDBOARD', { guildIdVar: 'COMMANDS_GUILD_ID' });

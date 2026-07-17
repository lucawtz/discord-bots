const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Registriert Slash Commands fuer einen Bot.
 * @param {string} commandsDir - Absoluter Pfad zum commands-Ordner
 * @param {string} botName - Name des Bots (fuer Logging)
 * @param {string} envPrefix - Praefix in der Root-.env.local ('MUSIC'/'SOUNDBOARD')
 * @param {object} [options]
 * @param {string} [options.guildIdVar='GUILD_ID'] - Env-Variable, aus der die
 *   Guild-ID fuer die Registrierung gelesen wird. Ist sie leer -> GLOBAL.
 *   soundboard-bot nutzt hier COMMANDS_GUILD_ID, damit das Laufzeit-GUILD_ID
 *   (Dashboard-Login) den Command-Scope NICHT beeinflusst.
 */
async function deployCommands(commandsDir, botName = 'Bot', envPrefix = botName.toUpperCase(), options = {}) {
    require('./loadEnv').loadEnv(envPrefix, path.join(commandsDir, '..', '..'));

    const { guildIdVar = 'GUILD_ID' } = options;
    const guildId = process.env[guildIdVar];

    const commands = [];
    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsDir, file));
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
        const scope = guildId ? `guild-scoped (${guildIdVar}=${guildId})` : 'GLOBAL';
        console.log(`[${botName}] Registriere ${commands.length} Commands (${scope})...`);

        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`[${botName}] Guild-Commands erfolgreich registriert!`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`[${botName}] Globale Commands erfolgreich registriert! (Propagation bis ~1 h)`);
        }
    } catch (error) {
        console.error(`[${botName}] Fehler beim Registrieren:`, error);
    }
}

module.exports = { deployCommands };

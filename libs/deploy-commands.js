const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Registriert Slash Commands fuer einen Bot.
 * @param {string} commandsDir - Absoluter Pfad zum commands-Ordner
 * @param {string} botName - Name des Bots (fuer Logging)
 */
async function deployCommands(commandsDir, botName = 'Bot') {
    require('dotenv').config({ path: path.join(commandsDir, '..', '..', '.env') });

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
        console.log(`[${botName}] Registriere ${commands.length} Commands...`);

        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`[${botName}] Guild-Commands erfolgreich registriert!`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`[${botName}] Globale Commands erfolgreich registriert!`);
        }
    } catch (error) {
        console.error(`[${botName}] Fehler beim Registrieren:`, error);
    }
}

module.exports = { deployCommands };

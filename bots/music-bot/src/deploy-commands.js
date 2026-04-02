const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Registriere ${commands.length} Slash Commands...`);

        if (process.env.GUILD_ID) {
            // Guild-spezifisch (sofort verfügbar, gut zum Testen)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log('✅ Guild Commands erfolgreich registriert.');
        } else {
            // Global (kann bis zu 1 Stunde dauern)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log('✅ Globale Commands erfolgreich registriert.');
        }
    } catch (error) {
        console.error(error);
    }
})();

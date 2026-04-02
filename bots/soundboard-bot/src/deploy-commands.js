require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registriere ${commands.length} Commands...`);

    if (process.env.GUILD_ID) {
      // Guild-Commands (sofort verfuegbar)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('Guild-Commands erfolgreich registriert!');
    } else {
      // Globale Commands (kann bis zu 1h dauern)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('Globale Commands erfolgreich registriert!');
    }
  } catch (error) {
    console.error('Fehler beim Registrieren:', error);
  }
})();

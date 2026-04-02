require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Events, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { handleButton, handleSelectMenu } = require('./handlers/interactionHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Commands laden
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Ready
client.once(Events.ClientReady, (c) => {
  console.log(`Bot ist online als ${c.user.tag}`);
  console.log(`In ${c.guilds.cache.size} Server(n)`);
});

// Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction);
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    // Select Menus
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
      return;
    }
  } catch (error) {
    console.error('Interaction-Fehler:', error);

    const reply = { content: 'Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

// Datenbank initialisieren, dann Bot + Web-Dashboard starten
const db = require('./database');
const { startWebServer } = require('./web/server');
const { disconnectAll } = require('./utils/player');

let webServer = null;

db.init().then(() => {
  console.log('Datenbank initialisiert');

  const port = process.env.PORT || process.env.WEB_PORT || 3000;
  webServer = startWebServer(port);

  client.login(process.env.DISCORD_TOKEN);
}).catch(err => {
  console.error('Datenbank-Fehler:', err);
  process.exit(1);
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`\n${signal} empfangen. Fahre herunter...`);

  disconnectAll();
  console.log('Voice-Connections getrennt.');

  db.save();
  console.log('Datenbank gespeichert.');

  if (webServer) {
    webServer.close(() => {
      console.log('Web-Server geschlossen.');
      client.destroy();
      console.log('Bot abgemeldet. Bye!');
      process.exit(0);
    });
  } else {
    client.destroy();
    console.log('Bot abgemeldet. Bye!');
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

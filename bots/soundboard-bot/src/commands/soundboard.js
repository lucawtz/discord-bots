const { SlashCommandBuilder } = require('discord.js');
const { buildSoundboardPanel } = require('../handlers/interactionHandler');
const { localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soundboard')
    .setDescription('Oeffnet das Soundboard-Panel')
    .setDescriptionLocalizations({ 'en-US': 'Opens the soundboard panel', 'en-GB': 'Opens the soundboard panel' }),

  async execute(interaction) {
    const panel = buildSoundboardPanel(interaction.user.id, 'predefined', 0, localeFor(interaction));
    await interaction.reply(panel);
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { buildSoundboardPanel } = require('../handlers/interactionHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soundboard')
    .setDescription('Oeffnet das Soundboard-Panel'),

  async execute(interaction) {
    const panel = buildSoundboardPanel(interaction.user.id, 'predefined', 0);
    await interaction.reply(panel);
  },
};

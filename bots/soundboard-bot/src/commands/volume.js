const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Stelle deine persoenliche Lautstaerke ein')
    .addIntegerOption(opt =>
      opt.setName('prozent')
        .setDescription('Lautstaerke in Prozent (0-200)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)),

  async execute(interaction) {
    const volume = interaction.options.getInteger('prozent');
    db.setVolume(interaction.user.id, volume);

    const bar = createVolumeBar(volume);
    await interaction.reply({
      content: `Lautstaerke auf **${volume}%** gesetzt\n${bar}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

function createVolumeBar(volume) {
  const filled = Math.round(volume / 10);
  const empty = 20 - filled;
  return `${'█'.repeat(Math.min(filled, 20))}${'░'.repeat(Math.max(empty, 0))}`;
}

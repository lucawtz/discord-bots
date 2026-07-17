const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Stelle deine persoenliche Lautstaerke ein')
    .setDescriptionLocalizations({ 'en-US': 'Set your personal volume', 'en-GB': 'Set your personal volume' })
    .addIntegerOption(opt =>
      opt.setName('prozent')
        .setDescription('Lautstaerke in Prozent (0-200)')
        .setDescriptionLocalizations({ 'en-US': 'Volume in percent (0-200)', 'en-GB': 'Volume in percent (0-200)' })
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)),

  async execute(interaction) {
    const volume = interaction.options.getInteger('prozent');
    db.setVolume(interaction.user.id, volume);

    const bar = createVolumeBar(volume);
    await interaction.reply({
      content: t('volume.set', localeFor(interaction), { percent: volume, bar }),
      flags: MessageFlags.Ephemeral,
    });
  },
};

function createVolumeBar(volume) {
  const filled = Math.round(volume / 10);
  const empty = 20 - filled;
  return `${'█'.repeat(Math.min(filled, 20))}${'░'.repeat(Math.max(empty, 0))}`;
}

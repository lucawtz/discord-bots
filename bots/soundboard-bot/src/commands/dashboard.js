const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Öffne das Soundboard-Dashboard im Browser')
    .setDescriptionLocalizations({ 'en-US': 'Open the soundboard dashboard in your browser', 'en-GB': 'Open the soundboard dashboard in your browser' }),

  async execute(interaction) {
    const url = process.env.WEB_URL || `http://localhost:${process.env.PORT || process.env.WEB_PORT || 3000}`;

    const loc = localeFor(interaction);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(t('dashboard.btn', loc))
        .setStyle(ButtonStyle.Link)
        .setURL(url)
        .setEmoji('🎵'),
    );

    await interaction.reply({
      content: t('dashboard.text', loc),
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

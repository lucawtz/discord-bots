const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Oeffne das Soundboard-Dashboard im Browser'),

  async execute(interaction) {
    const url = process.env.WEB_URL || `http://localhost:${process.env.PORT || process.env.WEB_PORT || 3000}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Dashboard oeffnen')
        .setStyle(ButtonStyle.Link)
        .setURL(url)
        .setEmoji('🎵'),
    );

    await interaction.reply({
      content: 'Verwalte deine Sounds im Web-Dashboard:',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

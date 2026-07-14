const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { WEBSITE, SUPPORT_INVITE } = require('../../../../libs/links');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Hilfe, Bug melden oder Feature vorschlagen — Link zum Support-Server'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x22D3EE)
      .setTitle('🛟 EarTastic Support')
      .setDescription(
        'Fragen, Bug gefunden oder eine Idee?\n' +
        'Komm auf den **ByteBots Support-Server** — dort helfen wir dir weiter und sammeln Feedback.',
      )
      .setFooter({ text: 'bytebots.de' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Support-Server beitreten').setStyle(ButtonStyle.Link).setURL(SUPPORT_INVITE).setEmoji('💬'),
      new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(WEBSITE).setEmoji('🌐'),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  },
};

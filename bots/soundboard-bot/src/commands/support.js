const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { WEBSITE, SUPPORT_INVITE } = require('../../../../libs/links');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Hilfe, Bug melden oder Feature vorschlagen — Link zum Support-Server')
    .setDescriptionLocalizations({ 'en-US': 'Get help, report a bug or suggest a feature — link to the support server', 'en-GB': 'Get help, report a bug or suggest a feature — link to the support server' }),

  async execute(interaction) {
    const loc = localeFor(interaction);
    const embed = new EmbedBuilder()
      .setColor(0x22D3EE)
      .setTitle('🛟 EarTastic Support')
      .setDescription(t('support.desc', loc))
      .setFooter({ text: 'bytebots.de' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel(t('support.join', loc)).setStyle(ButtonStyle.Link).setURL(SUPPORT_INVITE).setEmoji('💬'),
      new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(WEBSITE).setEmoji('🌐'),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  },
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { SUPPORT_INVITE, BEATBYTE_INVITE, EARTASTIC_INVITE, ADMIN_INVITE } = require('../../../../libs/links');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Lade die ByteBots auf deinen Server ein')
    .setDescriptionLocalizations({ 'en-US': 'Invite the ByteBots to your server', 'en-GB': 'Invite the ByteBots to your server' }),

  async execute(interaction) {
    const loc = localeFor(interaction);
    const embed = new EmbedBuilder()
      .setColor(0x6E41CC)
      .setTitle(t('invite.title', loc))
      .setDescription(t('invite.desc', loc))
      .setFooter({ text: 'bytebots.de' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('BeatByte').setStyle(ButtonStyle.Link).setURL(BEATBYTE_INVITE).setEmoji('🎵'),
      new ButtonBuilder().setLabel('EarTastic').setStyle(ButtonStyle.Link).setURL(EARTASTIC_INVITE).setEmoji('🔊'),
      new ButtonBuilder().setLabel('ByteBots Admin').setStyle(ButtonStyle.Link).setURL(ADMIN_INVITE).setEmoji('🛡️'),
      new ButtonBuilder().setLabel('Support-Server').setStyle(ButtonStyle.Link).setURL(SUPPORT_INVITE).setEmoji('💬'),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  },
};

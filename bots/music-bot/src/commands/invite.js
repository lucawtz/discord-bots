const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { SUPPORT_INVITE, BEATBYTE_INVITE, EARTASTIC_INVITE, ADMIN_INVITE } = require('../../../../libs/links');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Lade die ByteBots auf deinen Server ein'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x6E41CC)
            .setTitle('➕ ByteBots einladen')
            .setDescription(
                'Hol dir die **ByteBots** auf deinen Server — kostenlos & auf Deutsch:\n\n' +
                '🎵 **BeatByte** — Musik-Bot mit Web-Player\n' +
                '🔊 **EarTastic** — Soundboard mit Web-Dashboard\n' +
                '🛡️ **ByteBots Admin** — Server-Verwaltung *(in Entwicklung)*',
            )
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

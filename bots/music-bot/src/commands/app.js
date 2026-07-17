const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('app')
        .setDescription('Öffne den BeatByte Music Player')
        .setDescriptionLocalizations({ 'en-US': 'Open the BeatByte music player', 'en-GB': 'Open the BeatByte music player' }),

    async execute(interaction, ctx) {
        const apiPort = process.env.API_PORT || 3001;
        const webUrl = process.env.APP_URL || `http://localhost:${apiPort}`;
        const downloadUrl = process.env.APP_DOWNLOAD_URL || '';

        const code = ctx.generateAccessCode(interaction.guild.id);

        const loc = ctx.localeFor(interaction);
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'BeatByte', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(t('app.desc', loc, { code }))
            .setColor(0x6E41CC)
            .setFooter({ text: t('app.footer', loc) });

        const row = new ActionRowBuilder();
        row.addComponents(
            new ButtonBuilder()
                .setLabel(t('app.openPlayer', loc))
                .setStyle(ButtonStyle.Link)
                .setURL(webUrl)
                .setEmoji('🎵'),
        );

        if (downloadUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Desktop App')
                    .setStyle(ButtonStyle.Link)
                    .setURL(downloadUrl)
                    .setEmoji('💻'),
            );
        }

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};

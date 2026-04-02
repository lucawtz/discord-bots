const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('app')
        .setDescription('Öffne den Music Player im Browser oder lade die Desktop-App'),

    async execute(interaction, ctx) {
        const apiPort = process.env.API_PORT || 3001;
        const webUrl = process.env.APP_URL || `http://localhost:${apiPort}`;
        const downloadUrl = process.env.APP_DOWNLOAD_URL || '';

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'BeatByte Music Player' })
            .setDescription('Steuere den Bot bequem über den Music Player.\nWähle, wie du ihn öffnen möchtest:')
            .setColor(0x5865F2);

        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setLabel('Im Browser öffnen')
                .setStyle(ButtonStyle.Link)
                .setURL(webUrl)
                .setEmoji('🌐'),
        );

        if (downloadUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Desktop-App herunterladen')
                    .setStyle(ButtonStyle.Link)
                    .setURL(downloadUrl)
                    .setEmoji('💻'),
            );
        }

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};

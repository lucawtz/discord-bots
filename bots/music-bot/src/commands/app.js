const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('app')
        .setDescription('Zeigt den Zugangs-Code fuer den BeatByte Music Player'),

    async execute(interaction, ctx) {
        const apiPort = process.env.API_PORT || 3001;
        const webUrl = process.env.APP_URL || `http://localhost:${apiPort}`;
        const downloadUrl = process.env.APP_DOWNLOAD_URL || '';

        const code = ctx.generateAccessCode(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'BeatByte Music Player' })
            .setDescription([
                `Dein Zugangs-Code:`,
                `### \`${code}\``,
                ``,
                `**So geht's:**`,
                `1. Oeffne den [Music Player](${webUrl})`,
                `2. Gib den Code oben ein`,
                `3. Fertig!`,
                ``,
                `Code ist 7 Tage gueltig.`,
            ].join('\n'))
            .setColor(0x1db954);

        const row = new ActionRowBuilder();
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Im Browser oeffnen')
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

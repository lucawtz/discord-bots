const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('app')
        .setDescription('Öffne den BeatByte Music Player'),

    async execute(interaction, ctx) {
        const apiPort = process.env.API_PORT || 3001;
        const webUrl = process.env.APP_URL || `http://localhost:${apiPort}`;
        const downloadUrl = process.env.APP_DOWNLOAD_URL || '';

        const code = ctx.generateAccessCode(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'BeatByte', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription([
                `### Dein Zugangs-Code`,
                `# \`${code}\``,
                ``,
                `Oeffne den Music Player und gib diesen Code ein, um dich zu verbinden.`,
                ``,
                `Der Code ist **7 Tage** gueltig.`,
            ].join('\n'))
            .setColor(0x6E41CC)
            .setFooter({ text: 'Nur fuer dich sichtbar' });

        const row = new ActionRowBuilder();
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Player öffnen')
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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Sucht den Songtext zum aktuellen oder angegebenen Song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname (optional, sonst aktueller Song)')),

    async execute(interaction, ctx) {
        await interaction.deferReply();

        const queue = ctx.getQueue(interaction.guildId);
        const query = interaction.options.getString('query') || queue.current?.title;

        if (!query) {
            return interaction.editReply({ content: '❌ Kein Song angegeben und es wird nichts abgespielt.' });
        }

        try {
            // Genius-ähnliche Suche über Google
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' lyrics')}`;

            const embed = new EmbedBuilder()
                .setAuthor({ name: '🎤 Lyrics' })
                .setDescription(
                    `**${query}**\n\n` +
                    `Lyrics können aus rechtlichen Gründen nicht direkt angezeigt werden.\n\n` +
                    `🔗 [Google Suche](${searchUrl})\n` +
                    `🔗 [Genius](https://genius.com/search?q=${encodeURIComponent(query)})\n` +
                    `🔗 [AZLyrics](https://search.azlyrics.com/search.php?q=${encodeURIComponent(query)})`
                )
                .setColor(0xFBBC05);

            ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
        } catch (error) {
            ctx.autoDelete(interaction.editReply({ content: `❌ ${error.message}` }), ctx.DELETE_ERROR_MS);
        }
    },
};

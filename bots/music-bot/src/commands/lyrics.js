const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Sucht den Songtext zum aktuellen oder angegebenen Song')
        .setDescriptionLocalizations({ 'en-US': 'Finds the lyrics for the current or given song', 'en-GB': 'Finds the lyrics for the current or given song' })
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname (optional, sonst aktueller Song)').setDescriptionLocalizations({ 'en-US': 'Song name (optional, otherwise current song)', 'en-GB': 'Song name (optional, otherwise current song)' })),

    async execute(interaction, ctx) {
        await interaction.deferReply();

        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);
        const query = interaction.options.getString('query') || queue.current?.title;

        if (!query) {
            return interaction.editReply({ content: t('lyrics.noSong', loc) });
        }

        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' lyrics')}`;
            const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;
            const azUrl = `https://search.azlyrics.com/search.php?q=${encodeURIComponent(query)}`;

            const embed = new EmbedBuilder()
                .setAuthor({ name: t('lyrics.title', loc), iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(t('lyrics.body', loc, { query, searchUrl, geniusUrl, azUrl }))
                .setColor(0x6E41CC);

            ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
        } catch (error) {
            ctx.autoDelete(interaction.editReply({ content: t('play.error', loc, { message: error.message }) }), ctx.DELETE_ERROR_MS);
        }
    },
};

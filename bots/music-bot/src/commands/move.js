const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Verschiebt einen Song in der Warteschlange')
        .addIntegerOption(option =>
            option.setName('von')
                .setDescription('Aktuelle Position (1, 2, 3...)')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('nach')
                .setDescription('Neue Position (1, 2, 3...)')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const from = interaction.options.getInteger('von');
        const to = interaction.options.getInteger('nach');

        if (queue.tracks.length === 0) {
            return interaction.reply({ content: '❌ Die Warteschlange ist leer.', ephemeral: true });
        }

        if (from > queue.tracks.length || to > queue.tracks.length) {
            return interaction.reply({ content: `❌ Ungültige Position. Warteschlange hat ${queue.tracks.length} Songs.`, ephemeral: true });
        }

        if (from === to) {
            return interaction.reply({ content: '❌ Die Positionen sind identisch.', ephemeral: true });
        }

        const [track] = queue.tracks.splice(from - 1, 1);
        queue.tracks.splice(to - 1, 0, track);

        ctx.autoDelete(interaction.reply({
            content: `Moved **${track.title}** from position ${from} to ${to}.`,
            fetchReply: true,
        }), ctx.DELETE_SHORT_MS);
    },
};

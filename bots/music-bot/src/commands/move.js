const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Verschiebt einen Song in der Warteschlange')
        .setDescriptionLocalizations({ 'en-US': 'Moves a song in the queue', 'en-GB': 'Moves a song in the queue' })
        .addIntegerOption(option =>
            option.setName('von')
                .setDescription('Aktuelle Position (1, 2, 3...)').setDescriptionLocalizations({ 'en-US': 'Current position (1, 2, 3...)', 'en-GB': 'Current position (1, 2, 3...)' })
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('nach')
                .setDescription('Neue Position (1, 2, 3...)').setDescriptionLocalizations({ 'en-US': 'New position (1, 2, 3...)', 'en-GB': 'New position (1, 2, 3...)' })
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);
        const from = interaction.options.getInteger('von');
        const to = interaction.options.getInteger('nach');

        if (queue.tracks.length === 0) {
            return interaction.reply({ content: t('move.empty', loc), ephemeral: true });
        }

        if (from > queue.tracks.length || to > queue.tracks.length) {
            return interaction.reply({ content: t('move.invalidPos', loc, { n: queue.tracks.length }), ephemeral: true });
        }

        if (from === to) {
            return interaction.reply({ content: t('move.samePos', loc), ephemeral: true });
        }

        const [track] = queue.tracks.splice(from - 1, 1);
        queue.tracks.splice(to - 1, 0, track);

        ctx.autoDelete(interaction.reply({
            content: t('move.moved', loc, { title: track.title, from, to }),
            fetchReply: true,
        }), ctx.DELETE_SHORT_MS);
    },
};

const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entfernt einen Song aus der Warteschlange')
        .setDescriptionLocalizations({ 'en-US': 'Removes a song from the queue', 'en-GB': 'Removes a song from the queue' })
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position in der Warteschlange (1, 2, 3...)').setDescriptionLocalizations({ 'en-US': 'Position in the queue (1, 2, 3...)', 'en-GB': 'Position in the queue (1, 2, 3...)' })
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);
        const pos = interaction.options.getInteger('position');

        if (pos > queue.tracks.length) {
            return interaction.reply({ content: t('remove.notExist', loc, { pos, n: queue.tracks.length }), ephemeral: true });
        }

        const [removed] = queue.tracks.splice(pos - 1, 1);

        ctx.updateNowPlayingMsg(queue);
        ctx.autoDelete(interaction.reply({ content: t('remove.removed', loc, { title: removed.title, pos }), fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

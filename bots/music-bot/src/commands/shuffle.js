const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Mischt die Warteschlange zufällig')
        .setDescriptionLocalizations({ 'en-US': 'Shuffles the queue randomly', 'en-GB': 'Shuffles the queue randomly' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (queue.tracks.length < 2) {
            return interaction.reply({ content: t('buttons.notEnoughToShuffle', loc), ephemeral: true });
        }

        for (let i = queue.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
        }

        ctx.updateNowPlayingMsg(queue);
        ctx.autoDelete(interaction.reply({ content: t('shuffle.done', loc, { n: queue.tracks.length }), fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

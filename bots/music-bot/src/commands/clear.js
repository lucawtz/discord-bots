const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Leert die Warteschlange (aktueller Song läuft weiter)')
        .setDescriptionLocalizations({ 'en-US': 'Clears the queue (the current song keeps playing)', 'en-GB': 'Clears the queue (the current song keeps playing)' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (queue.tracks.length === 0) {
            return interaction.reply({ content: t('clear.empty', loc), ephemeral: true });
        }

        const count = queue.tracks.length;
        queue.tracks = [];
        queue._failedTrack = null;

        ctx.updateNowPlayingMsg(queue);
        ctx.autoDelete(interaction.reply({ content: t('clear.cleared', loc, { n: count }), fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

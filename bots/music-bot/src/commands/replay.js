const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Startet den aktuellen Song von vorne')
        .setDescriptionLocalizations({ 'en-US': 'Restarts the current song from the beginning', 'en-GB': 'Restarts the current song from the beginning' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!requirePlaying(interaction, queue, loc)) return;

        const track = queue.current;

        // Laufende Prozesse beenden und Song neu starten
        killQueueProcesses(queue);
        queue.tracks.unshift({ ...track, _retried: false });
        queue.player.stop();

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

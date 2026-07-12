const { SlashCommandBuilder } = require('discord.js');
const { killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stoppt die Wiedergabe'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!queue.current && !queue.connection) {
            return interaction.reply({ content: '❌ Es wird gerade nichts abgespielt.', ephemeral: true });
        }

        // Prozesse & Queue leeren, aber Connection behalten
        killQueueProcesses(queue);
        queue.tracks = [];
        queue.current = null;
        queue._failedTrack = null;
        queue.stopped = true;
        ctx.releaseNowPlaying(queue); // Embed 24h stehen lassen (wie beim Stop-Button)
        if (queue.player) queue.player.stop(true);

        // Nach Timeout den Channel verlassen
        ctx.scheduleLeave(interaction.guildId);

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

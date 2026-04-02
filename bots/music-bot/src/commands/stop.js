const { SlashCommandBuilder } = require('discord.js');

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
        for (const proc of queue.processes) {
            if (!proc.killed) proc.kill();
        }
        queue.processes.clear();
        queue.tracks = [];
        queue.current = null;
        queue._failedTrack = null;
        queue.stopped = true;
        if (queue._nowPlayingMsg) {
            queue._nowPlayingMsg.delete().catch(() => {});
            queue._nowPlayingMsg = null;
        }
        if (queue.player) queue.player.stop(true);

        // Nach Timeout den Channel verlassen
        ctx.scheduleLeave(interaction.guildId);

        ctx.autoDelete(interaction.reply({ content: '⏹️ Wiedergabe gestoppt.', fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

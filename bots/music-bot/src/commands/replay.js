const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Startet den aktuellen Song von vorne'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        const track = queue.current;

        // Laufende Prozesse beenden und Song neu starten
        killQueueProcesses(queue);
        queue.tracks.unshift({ ...track, _retried: false });
        queue.player.stop();

        ctx.autoDelete(interaction.reply({ content: `-# 🔄 **${track.title}** wird neu gestartet`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

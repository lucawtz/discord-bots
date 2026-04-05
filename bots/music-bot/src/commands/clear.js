const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Leert die Warteschlange (aktueller Song läuft weiter)'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (queue.tracks.length === 0) {
            return interaction.reply({ content: '❌ Die Warteschlange ist bereits leer.', ephemeral: true });
        }

        const count = queue.tracks.length;
        queue.tracks = [];
        queue._failedTrack = null;

        ctx.autoDelete(interaction.reply({ content: `Cleared **${count} song${count !== 1 ? 's' : ''}** from the queue.`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

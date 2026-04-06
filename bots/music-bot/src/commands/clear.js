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

        ctx.updateNowPlayingMsg(queue);
        ctx.autoDelete(interaction.reply({ content: `-# 🗑️ **${count} Song${count !== 1 ? 's' : ''}** aus der Warteschlange entfernt`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

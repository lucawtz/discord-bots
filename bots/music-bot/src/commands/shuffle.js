const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Mischt die Warteschlange zufällig'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (queue.tracks.length < 2) {
            return interaction.reply({ content: '❌ Nicht genug Songs zum Mischen.', ephemeral: true });
        }

        for (let i = queue.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
        }

        ctx.autoDelete(interaction.reply({ content: `🔀 **${queue.tracks.length} Songs** gemischt!`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

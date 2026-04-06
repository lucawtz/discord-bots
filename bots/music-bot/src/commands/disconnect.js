const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Bot verlässt den Voice Channel'),

    async execute(interaction, ctx) {
        const queue = ctx.queues.get(interaction.guildId);

        if (!queue || !queue.connection) {
            return interaction.reply({ content: '❌ Der Bot ist nicht verbunden.', ephemeral: true });
        }

        ctx.destroyQueue(interaction.guildId);

        ctx.autoDelete(interaction.reply({ content: `-# 👋 Disconnected`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

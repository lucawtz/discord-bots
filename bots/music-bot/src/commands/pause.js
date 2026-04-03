const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { requirePlaying } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausiert oder setzt die Wiedergabe fort'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        if (queue.player.state.status === AudioPlayerStatus.Paused) {
            queue.player.unpause();
            ctx.autoDelete(interaction.reply({ content: '▶️ Fortgesetzt.', fetchReply: true }), ctx.DELETE_SHORT_MS);
        } else {
            queue.player.pause();
            ctx.autoDelete(interaction.reply({ content: '⏸️ Pausiert.', fetchReply: true }), ctx.DELETE_SHORT_MS);
        }
    },
};

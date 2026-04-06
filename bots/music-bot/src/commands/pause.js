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
            queue._playbackStart = Date.now() - (queue._pausedElapsed || 0) * 1000;
            queue.player.unpause();
            ctx.updateNowPlayingMsg(queue);
            ctx.autoDelete(interaction.reply({ content: `-# ▶️ Fortgesetzt`, fetchReply: true }), ctx.DELETE_SHORT_MS);
        } else {
            queue._pausedElapsed = Math.floor((Date.now() - queue._playbackStart) / 1000) + (queue._seekOffset || 0);
            queue.player.pause();
            ctx.updateNowPlayingMsg(queue);
            ctx.autoDelete(interaction.reply({ content: `-# ⏸️ Pausiert`, fetchReply: true }), ctx.DELETE_SHORT_MS);
        }
    },
};

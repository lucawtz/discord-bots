const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { requirePlaying } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Zeigt den aktuell spielenden Song')
        .setDescriptionLocalizations({ 'en-US': 'Shows the currently playing song', 'en-GB': 'Shows the currently playing song' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!requirePlaying(interaction, queue, loc)) return;

        const elapsed = ctx.getElapsed(queue);
        const isPaused = queue.player?.state?.status === AudioPlayerStatus.Paused;
        const embed = ctx.buildNowPlayingEmbed(queue.current, queue, interaction.client, elapsed, loc);
        const rows = ctx.createPlayerButtons(queue.loopMode, isPaused);

        ctx.autoDelete(interaction.reply({ embeds: [embed], components: rows, fetchReply: true }));
    },
};

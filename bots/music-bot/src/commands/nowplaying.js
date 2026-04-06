const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Zeigt den aktuell spielenden Song'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        const elapsed = ctx.getElapsed(queue);
        const embed = ctx.buildNowPlayingEmbed(queue.current, queue, interaction.client, elapsed);

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
    },
};

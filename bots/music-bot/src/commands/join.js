const { SlashCommandBuilder } = require('discord.js');
const { requireVoiceChannel } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Bot tritt deinem Voice Channel bei'),

    async execute(interaction, ctx) {
        if (!requireVoiceChannel(interaction)) return;

        await ctx.ensureConnection(interaction, ctx);

        ctx.autoDelete(interaction.reply({ content: `-# 🔊 **${interaction.member.voice.channel.name}** beigetreten`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

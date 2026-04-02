const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Bot tritt deinem Voice Channel bei'),

    async execute(interaction, ctx) {
        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: '❌ Du musst in einem Voice Channel sein!', ephemeral: true });
        }

        await ctx.ensureConnection(interaction, ctx);

        ctx.autoDelete(interaction.reply({ content: `🔊 Bin in **${interaction.member.voice.channel.name}**!`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

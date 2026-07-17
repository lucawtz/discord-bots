const { SlashCommandBuilder } = require('discord.js');
const { requireVoiceChannel } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Bot tritt deinem Voice Channel bei')
        .setDescriptionLocalizations({ 'en-US': 'Bot joins your voice channel', 'en-GB': 'Bot joins your voice channel' }),

    async execute(interaction, ctx) {
        const loc = ctx.localeFor(interaction);
        if (!requireVoiceChannel(interaction, false, loc)) return;

        await ctx.ensureConnection(interaction, ctx);

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

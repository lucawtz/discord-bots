const { SlashCommandBuilder } = require('discord.js');
const { requireVoiceChannel, killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playnow')
        .setDescription('Überspringt alles und spielt den Song sofort')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname oder URL')
                .setRequired(true)),

    async execute(interaction, ctx) {
        await interaction.deferReply();

        if (!requireVoiceChannel(interaction, true)) return;

        const query = interaction.options.getString('query');
        const queue = ctx.getQueue(interaction.guild.id);

        try {
            const track = await ctx.searchTrack(query);
            track.requestedBy = interaction.user.toString();
            track._requestedById = interaction.user.id;

            await ctx.ensureConnection(interaction, ctx);

            // Warteschlange leeren, Track als einzigen setzen
            queue.tracks = [track];

            // Laufende Prozesse beenden
            killQueueProcesses(queue);
            queue.current = null;

            // Sofort abspielen — Now Playing Embed kommt von playNext
            ctx.playNext(interaction.guild.id);

            ctx.autoDelete(interaction.editReply({ content: `-# ⏭️ **${track.title}** wird abgespielt` }), ctx.DELETE_SHORT_MS);
        } catch (error) {
            console.error('PlayNow error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(interaction.guild.id);
            }
            ctx.autoDelete(interaction.editReply({ content: `❌ ${error.message}` }), ctx.DELETE_ERROR_MS);
        }
    },
};

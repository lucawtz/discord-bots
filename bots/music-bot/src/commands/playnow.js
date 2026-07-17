const { SlashCommandBuilder } = require('discord.js');
const { requireVoiceChannel, killQueueProcesses } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playnow')
        .setDescription('Überspringt alles und spielt den Song sofort')
        .setDescriptionLocalizations({ 'en-US': 'Skips everything and plays the song right away', 'en-GB': 'Skips everything and plays the song right away' })
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname oder URL').setDescriptionLocalizations({ 'en-US': 'Song name or URL', 'en-GB': 'Song name or URL' })
                .setRequired(true)),

    async execute(interaction, ctx) {
        await interaction.deferReply();
        const loc = ctx.localeFor(interaction);

        if (!requireVoiceChannel(interaction, true, loc)) return;

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

            interaction.deleteReply().catch(() => {});
        } catch (error) {
            console.error('PlayNow error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(interaction.guild.id);
            }
            ctx.autoDelete(interaction.editReply({ content: t('play.error', loc, { message: error.message }) }), ctx.DELETE_ERROR_MS);
        }
    },
};

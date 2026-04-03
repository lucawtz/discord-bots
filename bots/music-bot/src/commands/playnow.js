const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

            await ctx.ensureConnection(interaction, ctx);

            // Warteschlange leeren, Track als einzigen setzen
            queue.tracks = [track];

            // Laufende Prozesse beenden
            killQueueProcesses(queue);
            queue.current = null;

            // Sofort abspielen
            ctx.playNext(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'Warteschlange übersprungen — Spielt jetzt' })
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                    { name: 'Angefragt von', value: track.requestedBy, inline: true },
                )
                .setColor(0xED4245);

            ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
        } catch (error) {
            console.error('PlayNow error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(interaction.guild.id);
            }
            ctx.autoDelete(interaction.editReply({ content: `❌ ${error.message}` }), ctx.DELETE_ERROR_MS);
        }
    },
};

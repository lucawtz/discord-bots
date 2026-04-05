const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireVoiceChannel } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Spielt einen Song/Playlist oder fügt zur Warteschlange hinzu')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname, URL oder Playlist-URL')
                .setRequired(true)),

    async execute(interaction, ctx) {
        await interaction.deferReply();

        if (!requireVoiceChannel(interaction, true)) return;

        const query = interaction.options.getString('query');
        const queue = ctx.getQueue(interaction.guild.id);
        queue._djConsecutive = 0; // Reset Auto-DJ counter on manual play
        const wasPlaying = !!queue.current;

        try {
            await ctx.ensureConnection(interaction, ctx);

            // Playlist erkennen
            const isUrl = query.startsWith('http://') || query.startsWith('https://');
            if (isUrl && ctx.isPlaylistUrl(query)) {
                // Progressives Loading: Metadaten holen, ersten Song sofort spielen
                let meta = null;
                try { meta = await ctx.fetchPlaylistMeta(query); } catch {}

                if (meta && meta.rawTracks.length > 0) {
                    // Ersten Track sofort auflösen und abspielen
                    const firstInfo = meta.rawTracks[0];
                    const firstTrack = await ctx.searchTrack(firstInfo.searchQuery);
                    firstTrack.title = firstInfo.title;
                    if (firstInfo.artist) firstTrack.artist = firstInfo.artist;
                    if (firstInfo.albumArt) firstTrack.albumArt = firstInfo.albumArt;
                    firstTrack.requestedBy = interaction.user.toString();
                    firstTrack._requestedById = interaction.user.id;

                    queue.tracks.push(firstTrack);
                    if (!queue.current) {
                        ctx.playNext(interaction.guild.id);
                    }

                    const remaining = meta.rawTracks.length - 1;
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: 'Playlist hinzugefuegt', iconURL: interaction.client.user.displayAvatarURL() })
                        .setDescription(`**${meta.title}**`)
                        .addFields(
                            { name: 'Songs', value: `\`${meta.rawTracks.length}\``, inline: true },
                            { name: 'Angefragt von', value: interaction.user.toString(), inline: true },
                        )
                        .setColor(0x6E41CC)
                        .setFooter({ text: remaining > 0 ? `Lade ${remaining} weitere Songs im Hintergrund...` : '1 Song in der Warteschlange' });

                    ctx.autoDelete(interaction.editReply({ embeds: [embed] }));

                    // Restliche Tracks im Hintergrund laden
                    if (remaining > 0) {
                        ctx.resolvePlaylistInBackground(interaction.guild.id, meta.rawTracks.slice(1), interaction.user);
                    }
                    return;
                }

                // Fallback: YouTube/Amazon Music/andere (kein progressives Loading)
                const playlist = await ctx.searchPlaylist(query);
                const tracks = playlist.tracks.map(t => ({ ...t, requestedBy: interaction.user.toString(), _requestedById: interaction.user.id }));
                queue.tracks.push(...tracks);

                if (!queue.current) {
                    ctx.playNext(interaction.guild.id);
                }

                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Playlist hinzugefuegt', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`**${playlist.title}**`)
                    .addFields(
                        { name: 'Songs', value: `\`${tracks.length}\``, inline: true },
                        { name: 'Angefragt von', value: interaction.user.toString(), inline: true },
                    )
                    .setColor(0x6E41CC)
                    .setFooter({ text: `${queue.tracks.length} Song${queue.tracks.length !== 1 ? 's' : ''} in der Warteschlange` });

                ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
                return;
            }

            // Einzelner Track
            const track = await ctx.searchTrack(query);
            track.requestedBy = interaction.user.toString();
            track._requestedById = interaction.user.id;

            queue.tracks.push(track);

            if (!queue.current) {
                ctx.playNext(interaction.guild.id);
            }

            const embed = new EmbedBuilder()
                .setThumbnail(track.thumbnail)
                .setDescription(`[${track.title}](${track.url})`);

            if (wasPlaying) {
                embed.setAuthor({ name: 'Zur Warteschlange hinzugefuegt', iconURL: interaction.client.user.displayAvatarURL() })
                    .addFields(
                        { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                        { name: 'Position', value: `\`#${queue.tracks.length}\``, inline: true },
                        { name: 'Angefragt von', value: track.requestedBy, inline: true },
                    )
                    .setColor(0x6E41CC)
                    .setFooter({ text: `${queue.tracks.length} Song${queue.tracks.length !== 1 ? 's' : ''} in der Warteschlange` });
            } else {
                embed.setAuthor({ name: 'Spielt jetzt', iconURL: interaction.client.user.displayAvatarURL() })
                    .addFields(
                        { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                        { name: 'Angefragt von', value: track.requestedBy, inline: true },
                    )
                    .setColor(0x6E41CC);
            }

            ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
        } catch (error) {
            console.error('Play error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(interaction.guild.id);
            }
            ctx.autoDelete(interaction.editReply({ content: `❌ ${error.message}` }), ctx.DELETE_ERROR_MS);
        }
    },
};

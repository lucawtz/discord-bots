const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireVoiceChannel } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Spielt einen Song/Playlist oder fügt zur Warteschlange hinzu')
        .setDescriptionLocalizations({ 'en-US': 'Plays a song/playlist or adds it to the queue', 'en-GB': 'Plays a song/playlist or adds it to the queue' })
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname, URL oder Playlist-URL').setDescriptionLocalizations({ 'en-US': 'Song name, URL or playlist URL', 'en-GB': 'Song name, URL or playlist URL' })
                .setRequired(true)),

    async execute(interaction, ctx) {
        await interaction.deferReply();
        const loc = ctx.localeFor(interaction);

        if (!requireVoiceChannel(interaction, true, loc)) return;

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
                        .setAuthor({ name: t('play.playlistAdded', loc), iconURL: interaction.client.user.displayAvatarURL() })
                        .setDescription(`**${meta.title}**`)
                        .addFields(
                            { name: t('label.songs', loc), value: `\`${meta.rawTracks.length}\``, inline: true },
                            { name: t('label.requestedBy', loc), value: interaction.user.toString(), inline: true },
                        )
                        .setColor(0x6E41CC)
                        .setFooter({ text: remaining > 0 ? t('play.loadingMore', loc, { n: remaining }) : t('queue.count', loc, { n: 1 }) });

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
                    .setAuthor({ name: t('play.playlistAdded', loc), iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`**${playlist.title}**`)
                    .addFields(
                        { name: t('label.songs', loc), value: `\`${tracks.length}\``, inline: true },
                        { name: t('label.requestedBy', loc), value: interaction.user.toString(), inline: true },
                    )
                    .setColor(0x6E41CC)
                    .setFooter({ text: t('queue.count', loc, { n: queue.tracks.length }) });

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
                // Kein Einzeiler — das "Lädt…"/Now-Playing-Embed ist das Feedback
                interaction.deleteReply().catch(() => {});
            } else {
                // Sofort vorladen, damit /skip direkt wechseln kann
                ctx.prefetchNext(interaction.guild.id);
                // Quadratisches Cover fuer das Embed nachladen (statt letterboxed Thumb)
                try { await ctx.ensureAlbumArt(track); } catch { /* dann halt Thumbnail */ }
                const embed = new EmbedBuilder()
                    .setAuthor({ name: t('play.addedToQueue', loc), iconURL: interaction.client.user.displayAvatarURL() })
                    .setThumbnail(track.albumArt || track.thumbnail || null)
                    .setDescription(`[${track.title}](${track.url})`)
                    .addFields(
                        { name: t('label.duration', loc), value: `\`${track.duration}\``, inline: true },
                        { name: t('label.position', loc), value: `\`#${queue.tracks.length}\``, inline: true },
                        { name: t('label.requestedBy', loc), value: track.requestedBy, inline: true },
                    )
                    .setColor(0x6E41CC)
                    .setFooter({ text: t('queue.count', loc, { n: queue.tracks.length }) });

                ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
            }
        } catch (error) {
            console.error('Play error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(interaction.guild.id);
            }
            ctx.autoDelete(interaction.editReply({ content: t('play.error', loc, { message: error.message }) }), ctx.DELETE_ERROR_MS);
        }
    },
};

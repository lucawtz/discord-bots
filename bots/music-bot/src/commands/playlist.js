const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Playlists speichern, laden und verwalten')
        .setDescriptionLocalizations({ 'en-US': 'Save, load and manage playlists', 'en-GB': 'Save, load and manage playlists' })
        .addSubcommand(sub =>
            sub.setName('save')
                .setDescription('Speichert die aktuelle Queue als Playlist')
                .setDescriptionLocalizations({ 'en-US': 'Saves the current queue as a playlist', 'en-GB': 'Saves the current queue as a playlist' })
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setDescriptionLocalizations({ 'en-US': 'Playlist name', 'en-GB': 'Playlist name' }).setRequired(true).setMaxLength(50)))
        .addSubcommand(sub =>
            sub.setName('load')
                .setDescription('Lädt eine gespeicherte Playlist in die Queue')
                .setDescriptionLocalizations({ 'en-US': 'Loads a saved playlist into the queue', 'en-GB': 'Loads a saved playlist into the queue' })
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setDescriptionLocalizations({ 'en-US': 'Playlist name', 'en-GB': 'Playlist name' }).setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Zeigt alle deine gespeicherten Playlists')
                .setDescriptionLocalizations({ 'en-US': 'Shows all your saved playlists', 'en-GB': 'Shows all your saved playlists' }))
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Zeigt die Songs einer Playlist')
                .setDescriptionLocalizations({ 'en-US': 'Shows the songs of a playlist', 'en-GB': 'Shows the songs of a playlist' })
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setDescriptionLocalizations({ 'en-US': 'Playlist name', 'en-GB': 'Playlist name' }).setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Löscht eine gespeicherte Playlist')
                .setDescriptionLocalizations({ 'en-US': 'Deletes a saved playlist', 'en-GB': 'Deletes a saved playlist' })
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setDescriptionLocalizations({ 'en-US': 'Playlist name', 'en-GB': 'Playlist name' }).setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('import')
                .setDescription('Importiert eine Playlist von Spotify, Apple Music, Deezer oder Amazon Music')
                .setDescriptionLocalizations({ 'en-US': 'Imports a playlist from Spotify, Apple Music, Deezer or Amazon Music', 'en-GB': 'Imports a playlist from Spotify, Apple Music, Deezer or Amazon Music' })
                .addStringOption(opt =>
                    opt.setName('url').setDescription('Playlist- oder Album-URL').setDescriptionLocalizations({ 'en-US': 'Playlist or album URL', 'en-GB': 'Playlist or album URL' }).setRequired(true))
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name zum Speichern (optional, sonst Original-Name)').setDescriptionLocalizations({ 'en-US': 'Name to save under (optional, otherwise original name)', 'en-GB': 'Name to save under (optional, otherwise original name)' }).setMaxLength(50))),

    async autocomplete(interaction, ctx) {
        const focused = interaction.options.getFocused();
        const results = ctx.db.searchPlaylists(interaction.guildId, interaction.user.id, focused);
        await interaction.respond(
            results.slice(0, 25).map(p => ({
                name: `${p.name} (${p.track_count} Songs)`,
                value: p.name,
            }))
        );
    },

    async execute(interaction, ctx) {
        const sub = interaction.options.getSubcommand();
        const loc = ctx.localeFor(interaction);

        if (sub === 'save') {
            const name = interaction.options.getString('name');
            const queue = ctx.getQueue(interaction.guildId);

            // Tracks sammeln: current + queue
            const tracks = [];
            if (queue.current) tracks.push(queue.current);
            tracks.push(...queue.tracks);

            if (tracks.length === 0) {
                return interaction.reply({ content: t('playlist.noSongs', loc), ephemeral: true });
            }
            if (tracks.length > 200) {
                return interaction.reply({ content: t('playlist.max200', loc), ephemeral: true });
            }

            // Pruefen ob Name schon existiert
            const existing = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (existing) {
                return interaction.reply({ content: t('playlist.exists', loc, { name }), ephemeral: true });
            }

            try {
                ctx.db.createPlaylist(interaction.guildId, interaction.user.id, name, tracks);
            } catch (err) {
                return interaction.reply({ content: t('playlist.saveError', loc), ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: t('playlist.saved', loc), iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(t('playlist.nameCount', loc, { name, n: tracks.length }))
                .setColor(0x6E41CC)
                .setFooter({ text: t('playlist.loadHint', loc, { name }) });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'load') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: t('playlist.notFound', loc, { name }), ephemeral: true });
            }

            const full = ctx.db.getPlaylist(playlist.id);
            if (!full || full.tracks.length === 0) {
                return interaction.reply({ content: t('playlist.empty', loc), ephemeral: true });
            }

            const queue = ctx.getQueue(interaction.guildId);
            const tracks = full.tracks.map(t => ({
                title: t.title,
                url: t.url,
                duration: t.duration || '?:??',
                thumbnail: t.thumbnail || null,
                artist: t.artist || null,
                requestedBy: interaction.user.toString(),
                _requestedById: interaction.user.id,
            }));
            queue.tracks.push(...tracks);

            // Falls connected und nichts spielt, starten
            if (queue.connection && !queue.current) {
                ctx.playNext(interaction.guildId);
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: t('playlist.loaded', loc), iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(t('playlist.loadedDesc', loc, { name: full.name, n: tracks.length }))
                .setColor(0x6E41CC)
                .setFooter({ text: t('queue.count', loc, { n: queue.tracks.length }) });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'list') {
            const playlists = ctx.db.getPlaylists(interaction.guildId, interaction.user.id);
            if (playlists.length === 0) {
                return interaction.reply({ content: t('playlist.noneYet', loc), ephemeral: true });
            }

            const lines = playlists.map((p, i) =>
                `**${i + 1}.** ${p.name} — ${p.track_count} ${t('word.songs', loc, { n: p.track_count })}`
            );
            const embed = new EmbedBuilder()
                .setAuthor({ name: t('playlist.yours', loc), iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(lines.join('\n'))
                .setColor(0x6E41CC)
                .setFooter({ text: t('playlist.count', loc, { n: playlists.length }) });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'show') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: t('playlist.notFound', loc, { name }), ephemeral: true });
            }

            const full = ctx.db.getPlaylist(playlist.id);
            const lines = full.tracks.slice(0, 20).map((tr, i) =>
                `**${i + 1}.** ${tr.title}${tr.duration ? ` \`${tr.duration}\`` : ''}`
            );
            if (full.tracks.length > 20) {
                lines.push(t('queue.andMore', loc, { n: full.tracks.length - 20 }));
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: full.name, iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(lines.join('\n') || t('playlist.emptyLabel', loc))
                .setColor(0x6E41CC)
                .setFooter({ text: `${full.tracks.length} ${t('word.songs', loc, { n: full.tracks.length })}` });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'delete') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: t('playlist.notFound', loc, { name }), ephemeral: true });
            }

            ctx.db.deletePlaylist(playlist.id, interaction.user.id);
            ctx.autoDelete(interaction.reply({ content: t('playlist.deleted', loc, { name }), fetchReply: true }), ctx.DELETE_SHORT_MS);
        }

        else if (sub === 'import') {
            const url = interaction.options.getString('url');

            if (!ctx.isPlaylistUrl(url)) {
                return interaction.reply({ content: t('playlist.invalidUrl', loc), ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const playlist = await ctx.searchPlaylist(url);
                const tracks = playlist.tracks;

                if (tracks.length === 0) {
                    return interaction.editReply({ content: t('playlist.noTracks', loc) });
                }
                if (tracks.length > 200) {
                    tracks.length = 200; // Auf 200 begrenzen
                }

                const name = interaction.options.getString('name') || playlist.title.substring(0, 50);

                // Pruefen ob Name schon existiert
                const existing = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
                if (existing) {
                    return interaction.editReply({ content: t('playlist.existsHint', loc, { name }) });
                }

                ctx.db.createPlaylist(interaction.guildId, interaction.user.id, name, tracks);

                const embed = new EmbedBuilder()
                    .setAuthor({ name: t('playlist.imported', loc), iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(t('playlist.nameCount', loc, { name, n: tracks.length }))
                    .setColor(0x6E41CC)
                    .setFooter({ text: t('playlist.loadHint', loc, { name }) });
                ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
            } catch (error) {
                console.error('Playlist import error:', error.message);
                ctx.autoDelete(interaction.editReply({ content: t('play.error', loc, { message: error.message }) }), ctx.DELETE_ERROR_MS);
            }
        }
    },
};

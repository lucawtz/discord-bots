const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Playlists speichern, laden und verwalten')
        .addSubcommand(sub =>
            sub.setName('save')
                .setDescription('Speichert die aktuelle Queue als Playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setRequired(true).setMaxLength(50)))
        .addSubcommand(sub =>
            sub.setName('load')
                .setDescription('Laedt eine gespeicherte Playlist in die Queue')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Zeigt alle deine gespeicherten Playlists'))
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Zeigt die Songs einer Playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Loescht eine gespeicherte Playlist')
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name der Playlist').setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('import')
                .setDescription('Importiert eine Playlist von Spotify, Apple Music, Deezer oder Amazon Music')
                .addStringOption(opt =>
                    opt.setName('url').setDescription('Playlist- oder Album-URL').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('name').setDescription('Name zum Speichern (optional, sonst Original-Name)').setMaxLength(50))),

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

        if (sub === 'save') {
            const name = interaction.options.getString('name');
            const queue = ctx.getQueue(interaction.guildId);

            // Tracks sammeln: current + queue
            const tracks = [];
            if (queue.current) tracks.push(queue.current);
            tracks.push(...queue.tracks);

            if (tracks.length === 0) {
                return interaction.reply({ content: '❌ Keine Songs zum Speichern vorhanden.', ephemeral: true });
            }
            if (tracks.length > 200) {
                return interaction.reply({ content: '❌ Maximal 200 Songs pro Playlist.', ephemeral: true });
            }

            // Pruefen ob Name schon existiert
            const existing = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (existing) {
                return interaction.reply({ content: `❌ Du hast bereits eine Playlist namens **${name}**.`, ephemeral: true });
            }

            try {
                ctx.db.createPlaylist(interaction.guildId, interaction.user.id, name, tracks);
            } catch (err) {
                return interaction.reply({ content: '❌ Fehler beim Speichern der Playlist.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'Playlist gespeichert', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`**${name}** — ${tracks.length} Song${tracks.length !== 1 ? 's' : ''}`)
                .setColor(0x6E41CC)
                .setFooter({ text: `Lade mit /playlist load ${name}` });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'load') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: `❌ Playlist **${name}** nicht gefunden.`, ephemeral: true });
            }

            const full = ctx.db.getPlaylist(playlist.id);
            if (!full || full.tracks.length === 0) {
                return interaction.reply({ content: '❌ Diese Playlist ist leer.', ephemeral: true });
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
                .setAuthor({ name: 'Playlist geladen', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`**${full.name}** — ${tracks.length} Song${tracks.length !== 1 ? 's' : ''} zur Queue hinzugefuegt`)
                .setColor(0x6E41CC)
                .setFooter({ text: `${queue.tracks.length} Song${queue.tracks.length !== 1 ? 's' : ''} in der Warteschlange` });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'list') {
            const playlists = ctx.db.getPlaylists(interaction.guildId, interaction.user.id);
            if (playlists.length === 0) {
                return interaction.reply({ content: 'Du hast noch keine Playlists gespeichert.\nNutze `/playlist save <name>` um die aktuelle Queue zu speichern.', ephemeral: true });
            }

            const lines = playlists.map((p, i) =>
                `**${i + 1}.** ${p.name} — ${p.track_count} Song${p.track_count !== 1 ? 's' : ''}`
            );
            const embed = new EmbedBuilder()
                .setAuthor({ name: 'Deine Playlists', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(lines.join('\n'))
                .setColor(0x6E41CC)
                .setFooter({ text: `${playlists.length} Playlist${playlists.length !== 1 ? 's' : ''}` });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'show') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: `❌ Playlist **${name}** nicht gefunden.`, ephemeral: true });
            }

            const full = ctx.db.getPlaylist(playlist.id);
            const lines = full.tracks.slice(0, 20).map((t, i) =>
                `**${i + 1}.** ${t.title}${t.duration ? ` \`${t.duration}\`` : ''}`
            );
            if (full.tracks.length > 20) {
                lines.push(`*...und ${full.tracks.length - 20} weitere*`);
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: full.name, iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(lines.join('\n') || 'Leer')
                .setColor(0x6E41CC)
                .setFooter({ text: `${full.tracks.length} Song${full.tracks.length !== 1 ? 's' : ''}` });
            ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
        }

        else if (sub === 'delete') {
            const name = interaction.options.getString('name');
            const playlist = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
            if (!playlist) {
                return interaction.reply({ content: `❌ Playlist **${name}** nicht gefunden.`, ephemeral: true });
            }

            ctx.db.deletePlaylist(playlist.id, interaction.user.id);
            ctx.autoDelete(interaction.reply({ content: `-# 🗑️ Playlist **${name}** geloescht`, fetchReply: true }), ctx.DELETE_SHORT_MS);
        }

        else if (sub === 'import') {
            const url = interaction.options.getString('url');

            if (!ctx.isPlaylistUrl(url)) {
                return interaction.reply({ content: '❌ Ungueltige Playlist-URL. Unterstuetzt: Spotify, Apple Music, Deezer, Amazon Music, YouTube.', ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const playlist = await ctx.searchPlaylist(url);
                const tracks = playlist.tracks;

                if (tracks.length === 0) {
                    return interaction.editReply({ content: '❌ Konnte keine Songs aus dieser Playlist laden.' });
                }
                if (tracks.length > 200) {
                    tracks.length = 200; // Auf 200 begrenzen
                }

                const name = interaction.options.getString('name') || playlist.title.substring(0, 50);

                // Pruefen ob Name schon existiert
                const existing = ctx.db.getPlaylistByName(interaction.guildId, interaction.user.id, name);
                if (existing) {
                    return interaction.editReply({ content: `❌ Du hast bereits eine Playlist namens **${name}**. Waehle einen anderen Namen mit der \`name\` Option.` });
                }

                ctx.db.createPlaylist(interaction.guildId, interaction.user.id, name, tracks);

                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Playlist importiert', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`**${name}** — ${tracks.length} Song${tracks.length !== 1 ? 's' : ''}`)
                    .setColor(0x6E41CC)
                    .setFooter({ text: `Lade mit /playlist load ${name}` });
                ctx.autoDelete(interaction.editReply({ embeds: [embed] }));
            } catch (error) {
                console.error('Playlist import error:', error.message);
                ctx.autoDelete(interaction.editReply({ content: `❌ ${error.message}` }), ctx.DELETE_ERROR_MS);
            }
        }
    },
};

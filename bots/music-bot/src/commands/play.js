const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireVoiceChannel } = require('../utils/checks');
const { t } = require('../i18n');

// Discord begrenzt Autocomplete-Eintraege auf 100 Zeichen (Name und Wert).
const cut = (s, max = 100) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Spielt einen Song/Playlist oder fügt zur Warteschlange hinzu')
        .setDescriptionLocalizations({ 'en-US': 'Plays a song/playlist or adds it to the queue', 'en-GB': 'Plays a song/playlist or adds it to the queue' })
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Songname, URL oder Playlist-URL').setDescriptionLocalizations({ 'en-US': 'Song name, URL or playlist URL', 'en-GB': 'Song name, URL or playlist URL' })
                .setRequired(true)
                .setAutocomplete(true)),

    // Vorschlaege aus Deezer (~150ms, ohne Key). Zwei Gruende:
    //  1) Der User waehlt den Song aus, statt dass die Textsuche raten muss —
    //     genau dort entstanden die falschen/beschleunigten Treffer.
    //  2) Der Top-Treffer wird schon aufgeloest, waehrend der User noch liest.
    //     Beim Absenden ist die Quellensuche dann oft bereits im Cache.
    async autocomplete(interaction, ctx) {
        const focused = (interaction.options.getFocused() || '').trim();
        if (focused.length < 2 || /^https?:\/\//i.test(focused)) return interaction.respond([]);

        const hits = await ctx.deezerSuggest(focused, 5);
        await interaction.respond(hits.map(hit => ({
            name: cut(`${hit.title} — ${hit.artist}${hit.durationSec ? ` · ${hit.duration}` : ''}`),
            value: cut(hit.query),
        })));

        if (hits[0]) ctx.preResolveTrack(hits[0].query);
    },

    async execute(interaction, ctx) {
        const loc = ctx.localeFor(interaction);

        // Voice-Check VOR dem Defer. Danach ginge nur noch eine oeffentliche
        // Antwort, die als Fehlermeldung dauerhaft im Kanal stehen bleibt.
        if (!requireVoiceChannel(interaction, false, loc)) return;

        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const guildId = interaction.guild.id;
        const queue = ctx.getQueue(guildId);
        queue._djConsecutive = 0; // Reset Auto-DJ counter on manual play

        // Jede Bearbeitung der Antwort laeuft ueber show(): serialisiert (keine
        // parallelen PATCHes) und mit Stufennummer, damit eine spaet eintreffende
        // Sofort-Karte die fertige Player-Karte nicht wieder ueberschreibt.
        let stage = 0;
        let chain = Promise.resolve();
        const show = (n, payload) => {
            chain = chain.then(() => {
                if (n < stage) return null;
                stage = n;
                return interaction.editReply(payload);
            }).catch(() => null);
            return chain;
        };

        const t0 = Date.now();
        try {
            const isUrl = query.startsWith('http://') || query.startsWith('https://');

            // Voice-Handshake und Suche gleichzeitig starten — der Handshake
            // versteckt sich hinter der Suche, statt sie zu verzoegern.
            const connecting = ctx.ensureConnection(interaction, ctx);

            // Playlist erkennen
            if (isUrl && ctx.isPlaylistUrl(query)) {
                await connecting;
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
                        ctx.playNext(guildId);
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

                    ctx.autoDelete(show(2, { embeds: [embed] }));

                    // Restliche Tracks im Hintergrund laden
                    if (remaining > 0) {
                        ctx.resolvePlaylistInBackground(guildId, meta.rawTracks.slice(1), interaction.user);
                    }
                    return;
                }

                // Fallback: YouTube/Amazon Music/andere (kein progressives Loading)
                const playlist = await ctx.searchPlaylist(query);
                const tracks = playlist.tracks.map(tr => ({ ...tr, requestedBy: interaction.user.toString(), _requestedById: interaction.user.id }));
                queue.tracks.push(...tracks);

                if (!queue.current) {
                    ctx.playNext(guildId);
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

                ctx.autoDelete(show(2, { embeds: [embed] }));
                return;
            }

            // Einzelner Track
            const startsNow = !queue.current;

            // Sofort-Karte: Titel, Interpret und Cover kommen aus Deezer, lange
            // bevor feststeht, woher gestreamt wird. Der User sieht in ~200ms
            // eine fertige Karte statt sekundenlang "denkt nach…".
            if (startsNow && !isUrl) {
                ctx.quickMeta(query).then(meta => {
                    if (!meta) return;
                    meta.requestedBy = interaction.user.toString();
                    return show(1, {
                        embeds: [ctx.buildLoadingEmbed(meta, interaction.client, loc)],
                        components: ctx.createPlayerButtons(queue.loopMode, false, true),
                    });
                }).catch(() => {});
            }

            const [, track] = await Promise.all([connecting, ctx.searchTrack(query)]);
            console.log(`[timing] search+connect=${Date.now() - t0}ms · "${query}"`);

            track.requestedBy = interaction.user.toString();
            track._requestedById = interaction.user.id;
            queue.tracks.push(track);

            if (!queue.current) {
                // Die Antwort auf /play wird zur Player-Karte: playNext schreibt
                // dieselbe Nachricht weiter (Puffert -> Spielt jetzt), statt sie
                // zu loeschen und eine zweite Nachricht zu senden.
                ctx.playNext(guildId, {
                    sink: async (payload) => {
                        const msg = await show(2, payload);
                        if (!msg) throw new Error('Antwort auf /play nicht mehr editierbar');
                        return ctx.interactionCard(interaction, msg);
                    },
                });
            } else {
                // Sofort vorladen, damit /skip direkt wechseln kann
                ctx.prefetchNext(guildId);
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

                ctx.autoDelete(show(2, { embeds: [embed] }));
            }
        } catch (error) {
            console.error('Play error:', error.message);
            if (queue.connection && !queue.current) {
                ctx.destroyQueue(guildId);
            }
            // Stufe 9: ueberschreibt auch eine schon gezeigte Sofort-Karte.
            ctx.autoDelete(show(9, { content: t('play.error', loc, { message: error.message }), embeds: [], components: [] }), ctx.DELETE_ERROR_MS);
        }
    },
};

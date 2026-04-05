const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requirePlaying } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Zeigt den aktuell spielenden Song'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        const track = queue.current;
        const elapsed = ctx.getElapsed(queue);
        const total = ctx.parseDuration(track.duration);
        const progressBar = ctx.createProgressBar(elapsed, total);

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Spielt jetzt', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`[${track.title}](${track.url})\n\n${progressBar}`)
            .setThumbnail(track.albumArt || track.thumbnail)
            .addFields(
                ...(track.artist ? [{ name: 'Artist', value: track.artist, inline: true }] : []),
                { name: 'Angefragt von', value: track.requestedBy, inline: true },
            )
            .setColor(0x6E41CC);

        if (queue.loopMode !== 'off') {
            embed.addFields({ name: 'Loop', value: queue.loopMode === 'song' ? 'Song' : 'Queue', inline: true });
        }
        if (queue.filter !== 'off') {
            const filterLabels = { bassboost: 'Bassboost', nightcore: 'Nightcore', slowed: 'Slowed' };
            embed.addFields({ name: 'Filter', value: filterLabels[queue.filter] || queue.filter, inline: true });
        }

        const footerParts = [];
        footerParts.push(`Volume: ${Math.round(queue.volume * 100)}%`);
        if (queue.tracks.length > 0) {
            footerParts.push(`${queue.tracks.length} song${queue.tracks.length !== 1 ? 's' : ''} in queue`);
        }
        embed.setFooter({ text: footerParts.join(' \u2022 ') });

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
    },
};

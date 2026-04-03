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

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Spielt jetzt' })
            .setDescription(`[${track.title}](${track.url})`)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                { name: 'Angefragt von', value: track.requestedBy, inline: true },
            )
            .setColor(0xEB459E);

        if (queue.tracks.length > 0) {
            embed.setFooter({ text: `${queue.tracks.length} Song${queue.tracks.length !== 1 ? 's' : ''} in der Warteschlange` });
        }

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
    },
};

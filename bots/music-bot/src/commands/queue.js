const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Zeigt die aktuelle Warteschlange'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!queue.current) {
            return interaction.reply({ content: '❌ Es wird gerade nichts abgespielt.', ephemeral: true });
        }

        const current = queue.current;
        const tracks = queue.tracks;

        let description = `**▶️ Spielt jetzt:**\n[${current.title}](${current.url}) — \`${current.duration}\``;

        if (tracks.length > 0) {
            description += '\n\n**Nächste Songs:**\n' + tracks.slice(0, 10).map((t, i) =>
                `\`${i + 1}.\` [${t.title}](${t.url}) — \`${t.duration}\``
            ).join('\n');

            if (tracks.length > 10) {
                description += `\n\n*...und ${tracks.length - 10} weitere*`;
            }
        } else {
            description += '\n\n*Keine weiteren Songs in der Warteschlange.*';
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Warteschlange' })
            .setDescription(description)
            .setColor(0x5865F2)
            .setFooter({ text: `${tracks.length} Song${tracks.length !== 1 ? 's' : ''} in der Warteschlange` });

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
    },
};

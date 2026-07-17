const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Zeigt die aktuelle Warteschlange')
        .setDescriptionLocalizations({ 'en-US': 'Shows the current queue', 'en-GB': 'Shows the current queue' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!queue.current) {
            return interaction.reply({ content: t('checks.nothingPlaying', loc), ephemeral: true });
        }

        const current = queue.current;
        const tracks = queue.tracks;

        let description = `${t('queue.nowPlaying', loc)}\n[${current.title}](${current.url}) — \`${current.duration}\``;

        if (tracks.length > 0) {
            description += '\n\n' + t('queue.upNext', loc) + '\n' + tracks.slice(0, 10).map((tr, i) =>
                `\`${i + 1}.\` [${tr.title}](${tr.url}) — \`${tr.duration}\``
            ).join('\n');

            if (tracks.length > 10) {
                description += `\n\n${t('queue.andMore', loc, { n: tracks.length - 10 })}`;
            }
        } else {
            description += '\n\n' + t('queue.noMore', loc);
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: t('queue.title', loc), iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(description)
            .setColor(0x6E41CC)
            .setFooter({ text: t('queue.count', loc, { n: tracks.length }) });

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }));
    },
};

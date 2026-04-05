const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Überspringt den aktuellen Song'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        // DJ-Rolle, Admin, Moderator oder Song-Requester → sofort skippen
        const settings = ctx.db.getGuildSettings(interaction.guildId);
        const djRoleId = settings.dj_role_id;
        const isDJ = djRoleId && interaction.member.roles.cache.has(djRoleId);
        const isAdmin = interaction.member.permissions.has('Administrator');
        const isModerator = interaction.member.permissions.has('ModerateMembers');
        const isRequester = queue.current.requestedBy === interaction.user.toString();

        if (!isDJ && !isAdmin && !isModerator && !isRequester) {
            // Vote-Skip
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: '❌ Du musst im Voice Channel sein!', ephemeral: true });

            queue.skipVotes.add(interaction.user.id);
            const members = voiceChannel.members.filter(m => !m.user.bot).size;
            const needed = Math.ceil(members / 2);

            if (queue.skipVotes.size < needed) {
                return interaction.reply({
                    content: `🗳️ Skip-Vote: **${queue.skipVotes.size}/${needed}** — noch ${needed - queue.skipVotes.size} Vote${needed - queue.skipVotes.size !== 1 ? 's' : ''} nötig.`,
                    ephemeral: false,
                });
            }
        }

        const skipped = queue.current;
        const upcoming = queue.tracks.slice(0, 5);

        // Skip ausführen
        killQueueProcesses(queue);
        queue.player.stop();

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Song uebersprungen', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`~~[${skipped.title}](${skipped.url})~~ — \`${skipped.duration}\``)
            .setColor(0x6E41CC);

        if (upcoming.length > 0) {
            const nextSong = upcoming[0];
            embed.addFields({
                name: '▶️ Spielt als Nächstes',
                value: `[${nextSong.title}](${nextSong.url}) — \`${nextSong.duration}\``,
            });

            if (upcoming.length > 1) {
                embed.addFields({
                    name: `📋 Warteschlange (${queue.tracks.length})`,
                    value: upcoming.slice(1).map((t, i) =>
                        `\`${i + 2}.\` [${t.title}](${t.url}) — \`${t.duration}\``
                    ).join('\n') + (queue.tracks.length > 5 ? `\n*...und ${queue.tracks.length - 5} weitere*` : ''),
                });
            }
        } else {
            embed.setFooter({ text: 'Keine weiteren Songs in der Warteschlange' });
        }

        ctx.autoDelete(interaction.reply({ embeds: [embed], fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

const { SlashCommandBuilder } = require('discord.js');
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
                    content: `-# 🗳️ Skip-Vote: **${queue.skipVotes.size}/${needed}** — noch ${needed - queue.skipVotes.size} noetig`,
                });
            }
        }

        const skipped = queue.current;

        // Skip ausführen — Now Playing Embed fuer naechsten Song kommt von playNext
        killQueueProcesses(queue);
        queue.player.stop();

        ctx.autoDelete(interaction.reply({ content: `-# ⏭️ **${skipped.title}** uebersprungen`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

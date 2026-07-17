const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Überspringt den aktuellen Song')
        .setDescriptionLocalizations({ 'en-US': 'Skips the current song', 'en-GB': 'Skips the current song' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!requirePlaying(interaction, queue, loc)) return;

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
            if (!voiceChannel) return interaction.reply({ content: t('buttons.mustBeInVoice', loc), ephemeral: true });

            queue.skipVotes.add(interaction.user.id);
            const members = voiceChannel.members.filter(m => !m.user.bot).size;
            const needed = Math.ceil(members / 2);

            if (queue.skipVotes.size < needed) {
                return interaction.reply({
                    content: t('skip.vote', loc, { have: queue.skipVotes.size, need: needed, remaining: needed - queue.skipVotes.size }),
                });
            }
        }

        // Skip ausführen — Now Playing Embed für nächsten Song kommt von playNext
        killQueueProcesses(queue);
        queue.player.stop();

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

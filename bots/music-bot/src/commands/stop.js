const { SlashCommandBuilder } = require('discord.js');
const { killQueueProcesses } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stoppt die Wiedergabe')
        .setDescriptionLocalizations({ 'en-US': 'Stops playback', 'en-GB': 'Stops playback' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!queue.current && !queue.connection) {
            return interaction.reply({ content: t('checks.nothingPlaying', loc), ephemeral: true });
        }

        // Prozesse & Queue leeren, aber Connection behalten
        killQueueProcesses(queue);
        queue.tracks = [];
        queue.current = null;
        queue._failedTrack = null;
        queue.stopped = true;
        ctx.releaseNowPlaying(queue); // Embed 24h stehen lassen (wie beim Stop-Button)
        if (queue.player) queue.player.stop(true);

        // Nach Timeout den Channel verlassen
        ctx.scheduleLeave(interaction.guildId);

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

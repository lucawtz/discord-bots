const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autodj')
        .setDescription('Auto-DJ ein-/ausschalten — spielt automatisch ähnliche Songs')
        .setDescriptionLocalizations({ 'en-US': 'Toggle Auto-DJ — automatically plays similar songs', 'en-GB': 'Toggle Auto-DJ — automatically plays similar songs' }),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        queue.autoDj = !queue.autoDj;

        // In DB persistieren
        ctx.db.setGuildSetting(interaction.guildId, 'auto_dj', queue.autoDj ? 1 : 0);

        ctx.updateNowPlayingMsg(queue);
        const loc = ctx.localeFor(interaction);
        ctx.autoDelete(
            interaction.reply({ content: t(queue.autoDj ? 'autodj.on' : 'autodj.off', loc), fetchReply: true }),
            ctx.DELETE_SHORT_MS
        );

        ctx.broadcast('stateUpdate', ctx.getGuildState(interaction.guildId));
    },
};

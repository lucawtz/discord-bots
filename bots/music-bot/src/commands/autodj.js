const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autodj')
        .setDescription('Auto-DJ ein-/ausschalten — spielt automatisch aehnliche Songs'),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        queue.autoDj = !queue.autoDj;

        // In DB persistieren
        ctx.db.setGuildSetting(interaction.guildId, 'auto_dj', queue.autoDj ? 1 : 0);

        const status = queue.autoDj ? '**enabled**' : '**disabled**';
        ctx.autoDelete(
            interaction.reply({ content: `Auto-DJ ${status}.`, fetchReply: true }),
            ctx.DELETE_SHORT_MS
        );

        ctx.broadcast('stateUpdate', ctx.getGuildState(interaction.guildId));
    },
};

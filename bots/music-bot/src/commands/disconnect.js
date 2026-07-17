const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Bot verlässt den Voice Channel')
        .setDescriptionLocalizations({ 'en-US': 'Bot leaves the voice channel', 'en-GB': 'Bot leaves the voice channel' }),

    async execute(interaction, ctx) {
        const queue = ctx.queues.get(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!queue || !queue.connection) {
            return interaction.reply({ content: t('disconnect.notConnected', loc), ephemeral: true });
        }

        ctx.destroyQueue(interaction.guildId);

        interaction.deferReply().then(() => interaction.deleteReply()).catch(() => {});
    },
};

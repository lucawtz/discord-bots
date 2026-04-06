const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entfernt einen Song aus der Warteschlange')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position in der Warteschlange (1, 2, 3...)')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const pos = interaction.options.getInteger('position');

        if (pos > queue.tracks.length) {
            return interaction.reply({ content: `❌ Position ${pos} existiert nicht. Warteschlange hat ${queue.tracks.length} Songs.`, ephemeral: true });
        }

        const [removed] = queue.tracks.splice(pos - 1, 1);

        ctx.updateNowPlayingMsg(queue);
        ctx.autoDelete(interaction.reply({ content: `-# 🗑️ **${removed.title}** von Position ${pos} entfernt`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

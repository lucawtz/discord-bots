const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ändert die Lautstärke')
        .addIntegerOption(option =>
            option.setName('prozent')
                .setDescription('Lautstärke in Prozent (0-200)')
                .setMinValue(0)
                .setMaxValue(200)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const percent = interaction.options.getInteger('prozent');

        if (percent === null) {
            return interaction.reply({ content: `🔊 Aktuelle Lautstärke: **${Math.round(queue.volume * 100)}%**`, ephemeral: true });
        }

        queue.volume = percent / 100;
        if (queue._resource?.volume) {
            queue._resource.volume.setVolume(queue.volume);
        }

        const icon = percent === 0 ? '🔇' : percent < 50 ? '🔉' : '🔊';
        ctx.autoDelete(interaction.reply({ content: `${icon} Lautstärke: **${percent}%**`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

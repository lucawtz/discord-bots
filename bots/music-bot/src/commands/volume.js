const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ändert die Lautstärke')
        .setDescriptionLocalizations({ 'en-US': 'Changes the volume', 'en-GB': 'Changes the volume' })
        .addIntegerOption(option =>
            option.setName('prozent')
                .setDescription('Lautstärke in Prozent (0-200)').setDescriptionLocalizations({ 'en-US': 'Volume in percent (0-200)', 'en-GB': 'Volume in percent (0-200)' })
                .setMinValue(0)
                .setMaxValue(200)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);
        const percent = interaction.options.getInteger('prozent');

        if (percent === null) {
            return interaction.reply({ content: t('volume.current', loc, { percent: Math.round(queue.volume * 100) }), ephemeral: true });
        }

        queue.volume = percent / 100;
        if (queue._resource?.volume) {
            queue._resource.volume.setVolume(queue.volume);
        }

        ctx.autoDelete(interaction.reply({ content: t('volume.set', loc, { percent }), fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

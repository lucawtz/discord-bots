const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Ändert den Loop-Modus')
        .setDescriptionLocalizations({ 'en-US': 'Changes the loop mode', 'en-GB': 'Changes the loop mode' })
        .addStringOption(option =>
            option.setName('modus')
                .setDescription('Loop-Modus wählen').setDescriptionLocalizations({ 'en-US': 'Choose the loop mode', 'en-GB': 'Choose the loop mode' })
                .addChoices(
                    { name: 'Aus', name_localizations: { 'en-US': 'Off', 'en-GB': 'Off' }, value: 'off' },
                    { name: 'Song wiederholen', name_localizations: { 'en-US': 'Repeat song', 'en-GB': 'Repeat song' }, value: 'song' },
                    { name: 'Queue wiederholen', name_localizations: { 'en-US': 'Repeat queue', 'en-GB': 'Repeat queue' }, value: 'queue' },
                )),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const mode = interaction.options.getString('modus');

        if (mode) {
            queue.loopMode = mode;
        } else {
            // Ohne Argument: durchschalten
            const modes = ['off', 'song', 'queue'];
            const idx = (modes.indexOf(queue.loopMode) + 1) % modes.length;
            queue.loopMode = modes[idx];
        }

        ctx.updateNowPlayingMsg(queue);
        const loc = ctx.localeFor(interaction);
        const labels = { off: t('loop.off', loc), song: t('loop.song', loc), queue: t('loop.queue', loc) };
        ctx.autoDelete(interaction.reply({ content: labels[queue.loopMode], fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

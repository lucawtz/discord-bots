const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Aktiviert einen Audio-Filter')
        .setDescriptionLocalizations({ 'en-US': 'Activates an audio filter', 'en-GB': 'Activates an audio filter' })
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter auswählen').setDescriptionLocalizations({ 'en-US': 'Choose a filter', 'en-GB': 'Choose a filter' })
                .setRequired(true)
                .addChoices(
                    { name: 'Aus', name_localizations: { 'en-US': 'Off', 'en-GB': 'Off' }, value: 'off' },
                    { name: 'Bassboost', value: 'bassboost' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Slowed', value: 'slowed' },
                )),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!requirePlaying(interaction, queue, loc)) return;

        const filter = interaction.options.getString('filter');
        queue.filter = filter;

        // Stream mit neuem Filter neu starten (ab aktueller Position) — geteilter
        // Helfer, denselben nutzt auch der Web-App-API-Handler.
        ctx.restartCurrentWithFilter(queue);
        const labels = { off: t('filter.off', loc), bassboost: t('filter.bassboost', loc), nightcore: t('filter.nightcore', loc), slowed: t('filter.slowed', loc) };
        ctx.autoDelete(interaction.reply({ content: labels[filter], fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

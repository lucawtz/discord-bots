const { SlashCommandBuilder } = require('discord.js');
const { requirePlaying } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Aktiviert einen Audio-Filter')
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter auswählen')
                .setRequired(true)
                .addChoices(
                    { name: 'Aus', value: 'off' },
                    { name: 'Bassboost', value: 'bassboost' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Slowed', value: 'slowed' },
                )),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        const filter = interaction.options.getString('filter');
        queue.filter = filter;

        // Stream mit neuem Filter neu starten (ab aktueller Position) — geteilter
        // Helfer, denselben nutzt auch der Web-App-API-Handler.
        ctx.restartCurrentWithFilter(queue);
        const labels = { off: '-# 🎛️ Filter deaktiviert', bassboost: '-# 🎛️ Bassboost aktiviert', nightcore: '-# 🎛️ Nightcore aktiviert', slowed: '-# 🎛️ Slowed aktiviert' };
        ctx.autoDelete(interaction.reply({ content: labels[filter], fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

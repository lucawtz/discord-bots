const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Ändert den Loop-Modus')
        .addStringOption(option =>
            option.setName('modus')
                .setDescription('Loop-Modus wählen')
                .addChoices(
                    { name: 'Aus', value: 'off' },
                    { name: 'Song wiederholen', value: 'song' },
                    { name: 'Queue wiederholen', value: 'queue' },
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

        const labels = { off: 'Loop disabled.', song: 'Looping current song.', queue: 'Looping queue.' };
        ctx.autoDelete(interaction.reply({ content: labels[queue.loopMode], fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

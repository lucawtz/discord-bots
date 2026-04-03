const { SlashCommandBuilder } = require('discord.js');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Springt zu einer bestimmten Stelle im Song')
        .addStringOption(option =>
            option.setName('zeit')
                .setDescription('Zeitpunkt (z.B. 1:30 oder 90)')
                .setRequired(true)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);

        if (!requirePlaying(interaction, queue)) return;

        const input = interaction.options.getString('zeit');
        const seconds = parseTime(input);

        if (seconds === null || seconds < 0) {
            return interaction.reply({ content: '❌ Ungültiges Format. Nutze z.B. `1:30` oder `90`.', ephemeral: true });
        }

        // Alte Prozesse beenden
        killQueueProcesses(queue);

        // Neuen Stream ab Seek-Position starten
        const stream = ctx.createStream(queue.current.url, queue, (err) => {
            ctx.autoDelete(queue.channel?.send(`❌ Seek fehlgeschlagen: ${err.message}`), ctx.DELETE_ERROR_MS);
        });

        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        queue._resource = resource;
        queue.player.play(resource);

        queue._playbackStart = Date.now();
        queue._seekOffset = seconds;

        const formatted = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        ctx.autoDelete(interaction.reply({ content: `⏩ Springe zu **${formatted}**`, fetchReply: true }), ctx.DELETE_SHORT_MS);
    },
};

function parseTime(input) {
    // Format: "1:30" oder "90"
    if (input.includes(':')) {
        const parts = input.split(':').map(Number);
        if (parts.some(isNaN)) return null;
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return null;
    }
    const num = Number(input);
    return isNaN(num) ? null : Math.floor(num);
}

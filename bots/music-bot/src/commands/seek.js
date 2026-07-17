const { SlashCommandBuilder } = require('discord.js');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const { requirePlaying, killQueueProcesses } = require('../utils/checks');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Springt zu einer bestimmten Stelle im Song')
        .setDescriptionLocalizations({ 'en-US': 'Jumps to a specific position in the song', 'en-GB': 'Jumps to a specific position in the song' })
        .addStringOption(option =>
            option.setName('zeit')
                .setDescription('Zeitpunkt (z.B. 1:30 oder 90)').setDescriptionLocalizations({ 'en-US': 'Timestamp (e.g. 1:30 or 90)', 'en-GB': 'Timestamp (e.g. 1:30 or 90)' })
                .setRequired(true)),

    async execute(interaction, ctx) {
        const queue = ctx.getQueue(interaction.guildId);
        const loc = ctx.localeFor(interaction);

        if (!requirePlaying(interaction, queue, loc)) return;

        const input = interaction.options.getString('zeit');
        const seconds = parseTime(input);

        if (seconds === null || seconds < 0) {
            return interaction.reply({ content: t('seek.invalidFormat', loc), ephemeral: true });
        }

        // Alte Prozesse beenden
        killQueueProcesses(queue);

        // Neuen Stream ab Seek-Position starten
        const stream = ctx.createStream(queue.current.url, queue, (err) => {
            ctx.autoDelete(queue.channel?.send(t('seek.failed', loc, { message: err.message })), ctx.DELETE_ERROR_MS);
        }, seconds);

        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        queue._resource = resource;
        queue.player.play(resource);

        queue._playbackStart = Date.now();
        queue._seekOffset = seconds;

        const formatted = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        ctx.autoDelete(interaction.reply({ content: t('seek.jumping', loc, { time: formatted }), fetchReply: true }), ctx.DELETE_SHORT_MS);
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

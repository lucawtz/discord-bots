const { t } = require('../i18n');

/**
 * Prueft ob der User in einem Voice Channel ist.
 * @param {string} locale - 'de' | 'en' (Default 'de' fuer noch nicht migrierte Aufrufer)
 * @returns {boolean} false wenn nicht im Channel (Antwort wurde gesendet)
 */
function requireVoiceChannel(interaction, deferred = false, locale = 'de') {
    if (!interaction.member.voice.channel) {
        const msg = t('checks.voiceRequired', locale);
        if (deferred) {
            interaction.editReply({ content: msg });
        } else {
            interaction.reply({ content: msg, ephemeral: true });
        }
        return false;
    }
    return true;
}

/**
 * Prueft ob etwas abgespielt wird (current + player existieren).
 * @param {string} locale - 'de' | 'en'
 * @returns {boolean} false wenn nichts laeuft (Antwort wurde gesendet)
 */
function requirePlaying(interaction, queue, locale = 'de') {
    if (!queue.current || !queue.player) {
        interaction.reply({ content: t('checks.nothingPlaying', locale), ephemeral: true });
        return false;
    }
    return true;
}

/**
 * Beendet alle laufenden Prozesse einer Queue.
 */
function killQueueProcesses(queue) {
    for (const proc of queue.processes) {
        if (!proc.killed) proc.kill();
    }
    queue.processes.clear();
}

module.exports = { requireVoiceChannel, requirePlaying, killQueueProcesses };

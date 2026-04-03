/**
 * Prueft ob der User in einem Voice Channel ist.
 * @returns {boolean} false wenn nicht im Channel (Antwort wurde gesendet)
 */
function requireVoiceChannel(interaction, deferred = false) {
    if (!interaction.member.voice.channel) {
        const msg = '❌ Du musst in einem Voice Channel sein!';
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
 * @returns {boolean} false wenn nichts laeuft (Antwort wurde gesendet)
 */
function requirePlaying(interaction, queue) {
    if (!queue.current || !queue.player) {
        interaction.reply({ content: '❌ Es wird gerade nichts abgespielt.', ephemeral: true });
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

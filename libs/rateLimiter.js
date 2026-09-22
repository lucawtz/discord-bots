/**
 * Erstellt einen Rate Limiter mit automatischem Cleanup.
 * @param {number} maxRequests - Max. erlaubte Requests im Zeitfenster
 * @param {number} windowMs - Zeitfenster in Millisekunden
 * @returns {(ip: string) => boolean} - true wenn Limit ueberschritten
 */
function createRateLimiter(maxRequests, windowMs) {
    const hits = new Map();
    // unref: der Aufraeum-Timer haelt den Prozess nicht am Leben. In Prod
    // halten Discord-Client und HTTP-Server ihn ohnehin wach; ohne unref
    // endet dagegen kein Testlauf, der einen Limiter anlegt.
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of hits) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) hits.delete(ip);
            else hits.set(ip, valid);
        }
    }, 60000);
    cleanup.unref?.();
    return (ip) => {
        const now = Date.now();
        const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
        timestamps.push(now);
        hits.set(ip, timestamps);
        return timestamps.length > maxRequests;
    };
}

module.exports = { createRateLimiter };

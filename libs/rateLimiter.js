/**
 * Erstellt einen Rate Limiter mit automatischem Cleanup.
 * @param {number} maxRequests - Max. erlaubte Requests im Zeitfenster
 * @param {number} windowMs - Zeitfenster in Millisekunden
 * @returns {(ip: string) => boolean} - true wenn Limit ueberschritten
 */
function createRateLimiter(maxRequests, windowMs) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of hits) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) hits.delete(ip);
            else hits.set(ip, valid);
        }
    }, 60000);
    return (ip) => {
        const now = Date.now();
        const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
        timestamps.push(now);
        hits.set(ip, timestamps);
        return timestamps.length > maxRequests;
    };
}

module.exports = { createRateLimiter };

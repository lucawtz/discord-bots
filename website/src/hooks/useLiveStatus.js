import { useCallback, useEffect, useState } from 'react';

// Live-Checks laufen im Browser des Besuchers gegen unauthentifizierte,
// CORS-freigegebene Endpoints (Origin bytebots.de ist bei beiden Bots erlaubt).
// beatbyte: GET /status (HTML-Statusseite des Music-Bots)
// eartastic: GET /api/health -> { status, uptime, sounds }
const CHECK_URLS = {
    beat: 'https://beatbyte.bytebots.de/status',
    ear: 'https://soundboard.bytebots.de/api/health',
};

const TIMEOUT_MS = 8000;

async function probe(url, { json = false } = {}) {
    const started = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        try {
            const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
            const ms = Math.round(performance.now() - started);
            const data = json && res.ok ? await res.json().catch(() => null) : null;
            return { state: res.ok ? 'up' : 'down', ms, data };
        } catch {
            // CORS-Fehler (z. B. im Dev auf localhost) heisst nicht offline:
            // ein opaquer no-cors-Request klappt, solange der Server antwortet.
            await fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' });
            return { state: 'up', ms: Math.round(performance.now() - started), data: null };
        }
    } catch {
        return { state: 'down', ms: null, data: null };
    } finally {
        clearTimeout(timer);
    }
}

const CHECKING = { state: 'checking', ms: null, data: null };

export function formatUptime(seconds) {
    if (!Number.isFinite(seconds)) return null;
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} d ${h} h`;
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
}

export function useLiveStatus() {
    const [status, setStatus] = useState({
        beat: CHECKING, ear: CHECKING, dashboard: CHECKING, website: CHECKING,
    });
    const [checkedAt, setCheckedAt] = useState(null);

    const refresh = useCallback(async () => {
        setStatus({ beat: CHECKING, ear: CHECKING, dashboard: CHECKING, website: CHECKING });
        const [beat, ear, website] = await Promise.all([
            probe(CHECK_URLS.beat),
            probe(CHECK_URLS.ear, { json: true }),
            probe('/', {}),
        ]);
        // Dashboard und EarTastic-Bot sind derselbe Prozess (ein Server, Port 3002)
        setStatus({ beat, ear, dashboard: ear, website });
        setCheckedAt(new Date());
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return { status, refresh, checkedAt };
}

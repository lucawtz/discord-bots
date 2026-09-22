// poToken-Bruecke: bgutil-POT-Provider -> Lavalink.
//
// ACHTUNG — Messergebnis vom 2026-09-22: Diese Bruecke funktioniert technisch
// (Token wird erzeugt, gebunden und von Lavalink angenommen), REICHT ABER NICHT.
// Die Abdeckung blieb mit und ohne poToken bei 1 von 4 Tracks. Grund laut den
// Fehlern pro Client:
//   WEB                 -> "No supported audio streams available" = SABR.
//                          YouTube liefert dort ueberhaupt keine https-Formate
//                          mehr, ein poToken aendert daran nichts.
//   WEB_EMBEDDED_PLAYER -> "This video is unavailable"
//   ANDROID_VR          -> "This video requires login"
// Die Clients, die noch brauchbare Formate liefern (TVHTML5 & Co.), werden fuer
// die Wiedergabe gar nicht erst versucht: sie sind OAuth-Clients
// (Tv.supportsOAuth() == true). Ohne OAuth faellt youtube-source auf genau die
// drei oben zurueck.
//
// Die Bruecke bleibt trotzdem hier: sie ist die einzige Nicht-OAuth-Massnahme,
// sie kostet nichts (nur aktiv, wenn POT_PROVIDER_URL gesetzt ist), und der
// Provider laeuft in Prod ohnehin fuer die yt-dlp-Pipeline. Ob sie zusammen mit
// OAuth einen Unterschied macht, ist ungetestet.
//
// Ablauf, alle paar Stunden:
//   1. visitorData von youtube.com holen (steckt im ytcfg der Startseite)
//   2. POST {provider}/get_pot  { content_binding: <visitorData> }
//        -> { poToken, contentBinding, expiresAt }
//   3. POST {lavalink}/youtube  { poToken, visitorData }
//
// Die Bindung ist der Knackpunkt: ein poToken gilt NUR zu dem visitorData, mit
// dem er erzeugt wurde. Beide muessen als Paar zu Lavalink.

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Sicherheitsabstand vor expiresAt — lieber einmal zu frueh erneuern als mitten
// im Abend ohne gueltigen Token dastehen.
const RENEW_MARGIN_MS = 30 * 60_000;      // 30 Minuten
const FALLBACK_TTL_MS = 6 * 60 * 60_000;  // 6 h, falls expiresAt fehlt
const MIN_INTERVAL_MS = 5 * 60_000;       // nie oefter als alle 5 Minuten
const RETRY_BASE_MS = 60_000;             // Backoff nach Fehlern

async function fetchJson(url, { method = 'GET', body, timeoutMs = 20_000, headers = {} } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method,
            headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            signal: ctrl.signal,
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* kein JSON */ }
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}${text ? ` — ${text.slice(0, 120)}` : ''}`);
        return data;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * visitorData aus der YouTube-Startseite. Steckt im eingebetteten ytcfg-JSON.
 * Kein API-Key noetig, kein Login.
 */
async function fetchVisitorData({ userAgent = DEFAULT_UA, timeoutMs = 20_000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch('https://www.youtube.com/', {
            headers: { 'User-Agent': userAgent, 'Accept-Language': 'en-US,en;q=0.9' },
            signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`youtube.com antwortete mit HTTP ${res.status}`);
        const html = await res.text();
        // Beide Schreibweisen kommen vor, je nach ausgeliefertem Bundle.
        const match = html.match(/"visitorData":"(.*?)"/) || html.match(/"VISITOR_DATA":"(.*?)"/);
        if (!match) throw new Error('visitorData nicht in der Startseite gefunden (YouTube-Layout geaendert?)');
        // Im HTML steht es escaped (\x3d statt =).
        return JSON.parse(`"${match[1]}"`);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * poToken beim bgutil-Provider anfordern, gebunden an visitorData.
 * @param {string} providerUrl z.B. http://pot-provider:4416
 * @param {string} visitorData
 * @param {object} [opts] proxy: optionaler Proxy, den der Provider beim Minten nutzt
 */
async function mintPoToken(providerUrl, visitorData, { proxy, bypassCache = false, timeoutMs = 60_000 } = {}) {
    const data = await fetchJson(`${providerUrl.replace(/\/$/, '')}/get_pot`, {
        method: 'POST',
        timeoutMs,
        body: {
            content_binding: visitorData,
            bypass_cache: bypassCache,
            ...(proxy ? { proxy } : {}),
        },
    });
    if (!data?.poToken) throw new Error('Provider lieferte keinen poToken');
    return {
        poToken: data.poToken,
        visitorData: data.contentBinding || visitorData,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    };
}

/** Erreichbarkeit + Version des Providers. */
async function pingProvider(providerUrl, { timeoutMs = 10_000 } = {}) {
    return fetchJson(`${providerUrl.replace(/\/$/, '')}/ping`, { timeoutMs });
}

/**
 * Token an Lavalink uebergeben. Die Route liegt auf der Wurzel (/youtube),
 * NICHT unter /v4 — sie gehoert dem Plugin, nicht dem Lavalink-Protokoll.
 */
async function pushToLavalink({ host, port, password }, { poToken, visitorData }, { timeoutMs = 15_000 } = {}) {
    await fetchJson(`http://${host}:${port}/youtube`, {
        method: 'POST',
        timeoutMs,
        headers: { Authorization: password },
        body: { poToken, visitorData },
    });
}

/**
 * Haelt den Token dauerhaft frisch. Startet sofort einen Durchlauf und plant
 * den naechsten anhand von expiresAt.
 *
 * Bewusst ohne Wiedergabe-Abhaengigkeit: ein abgelaufener Token faellt sonst
 * erst auf, wenn jemand Musik hoeren will.
 */
function startPotRefresher({
    lavalink,                 // { host, port, password }
    providerUrl,
    proxy = null,
    onLog = console.log,
    onError = console.error,
    // Austauschbar, damit der Erfolgspfad ohne echtes YouTube testbar ist.
    getVisitorData = fetchVisitorData,
} = {}) {
    let timer = null;
    let stopped = false;
    let failures = 0;
    const state = { poToken: null, visitorData: null, expiresAt: null, lastOk: null, lastError: null };

    async function cycle() {
        if (stopped) return;
        try {
            const visitorData = await getVisitorData();
            const minted = await mintPoToken(providerUrl, visitorData, { proxy });
            await pushToLavalink(lavalink, minted);

            failures = 0;
            Object.assign(state, {
                poToken: minted.poToken,
                visitorData: minted.visitorData,
                expiresAt: minted.expiresAt,
                lastOk: new Date(),
                lastError: null,
            });
            const ttl = minted.expiresAt ? minted.expiresAt.getTime() - Date.now() : FALLBACK_TTL_MS;
            onLog(`poToken erneuert (${minted.poToken.length} Zeichen), gueltig bis `
                + `${minted.expiresAt ? minted.expiresAt.toISOString() : 'unbekannt'}`);
            schedule(Math.max(MIN_INTERVAL_MS, ttl - RENEW_MARGIN_MS));
        } catch (err) {
            failures++;
            state.lastError = err.message;
            onError(`poToken fehlgeschlagen (Versuch ${failures}): ${err.message}`);
            // Exponentiell, aber gedeckelt: der Provider kann kurz weg sein.
            schedule(Math.min(30 * 60_000, RETRY_BASE_MS * 2 ** (failures - 1)));
        }
    }

    function schedule(ms) {
        if (stopped) return;
        clearTimeout(timer);
        timer = setTimeout(cycle, ms);
        timer.unref?.();
    }

    return {
        state,
        started: cycle(),                       // erster Durchlauf sofort
        refreshNow: () => { clearTimeout(timer); return cycle(); },
        stop: () => { stopped = true; clearTimeout(timer); },
    };
}

module.exports = {
    fetchVisitorData, mintPoToken, pingProvider, pushToLavalink, startPotRefresher,
    RENEW_MARGIN_MS, FALLBACK_TTL_MS, MIN_INTERVAL_MS,
};

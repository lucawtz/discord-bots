// Gesundheit der Wiedergabe-Kette — nicht des Prozesses.
//
// Das Problem, das dieses Modul loest: /status meldet "Online", solange Node
// laeuft. Ob yt-dlp, der POT-Provider, der Heim-Tunnel und YouTube zusammen
// noch einen Song liefern, sagt es nicht. Genau daran lag es, dass der
// WARP-Daemon 2026-08/09 vierundzwanzig Tage unbemerkt tot war — und am
// 2026-09-22 brauchte es einen Menschen mit einer Kommandozeile, um
// ueberhaupt festzustellen, ob der Bot noch spielt.
//
// Zwei Quellen:
//   1. SYNTHETISCHE PROBE — laedt in festem Takt wirklich die ersten Bytes
//      eines bekannten Tracks durch dieselbe yt-dlp-Kette wie die Wiedergabe.
//      Erste Bytes reichen: scheitert die Kette, scheitert sie sofort
//      (403/ProxyError kommen vor dem ersten Byte).
//   2. PASSIVE ZAEHLER — was die echte Wiedergabe erlebt. Besonders der
//      SoundCloud-Anteil: steigt er, bricht YouTube gerade weg. Das ist das
//      Fruehwarnsignal, das vor der Probe anschlaegt.
//
// Bewusst NICHT an den Docker-Healthcheck gehaengt: eine YouTube-Sperre
// repariert kein Container-Neustart, autoheal wuerde nur in eine
// Neustartschleife laufen. Die Kette meldet sich, sie startet nichts neu.

const PROBE_INTERVAL_MS = Number(process.env.HEALTH_PROBE_INTERVAL_MS) || 15 * 60_000;
const PROBE_TIMEOUT_MS = Number(process.env.HEALTH_PROBE_TIMEOUT_MS) || 60_000;
// Erst nach der zweiten Fehlprobe Alarm — eine einzelne kann ein Netz-Zucken sein.
const FAILURES_BEFORE_ALERT = 2;
// Nach einem Fehlschlag frueher nachfassen als im Normaltakt.
const RETRY_INTERVAL_MS = 2 * 60_000;
const PROBE_BYTES = 64 * 1024;
// Stabiles, weltweit abrufbares Video. Ueberschreibbar, falls es je verschwindet.
const PROBE_URL = process.env.HEALTH_PROBE_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// Gleitendes Fenster fuer Kennzahlen — kein Prometheus, keine Abhaengigkeit.
class Window {
    constructor(max = 200) { this.max = max; this.values = []; }
    push(v) { this.values.push(v); if (this.values.length > this.max) this.values.shift(); }
    get count() { return this.values.length; }
    // Lineare Interpolation — bei vier Werten ist der Median der Schnitt der
    // beiden mittleren, nicht der dritte. Sonst wirkt p50 systematisch zu hoch.
    percentile(p) {
        const n = this.values.length;
        if (!n) return null;
        const sorted = [...this.values].sort((a, b) => a - b);
        const pos = (n - 1) * p;
        const lo = Math.floor(pos), hi = Math.ceil(pos);
        if (lo === hi) return sorted[lo];
        return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
    }
}

function createHealthMonitor({
    spawn,            // der ctx-Spawn, damit Tests ihn ersetzen koennen
    ytdlpPath,
    buildProbeArgs,   // (url) => string[] — exakt die Argumente der Wiedergabe
    notifyError = () => {},
    notifyInfo = () => {},
    onLog = console.log,
    // Zeitwerte als Optionen, nicht nur als Modul-Konstanten: sonst liesse sich
    // das Zeitverhalten im Test nicht pruefen, ohne 60 s zu warten.
    intervalMs = PROBE_INTERVAL_MS,
    timeoutMs = PROBE_TIMEOUT_MS,
    retryMs = RETRY_INTERVAL_MS,
    probeUrl = PROBE_URL,
} = {}) {
    const metrics = {
        trackStarts: 0,
        firstAudioMs: new Window(),
        searchMs: new Window(),
        // Quelle pro gestartetem Track. Ein wachsender soundcloud-Anteil heisst:
        // YouTube liefert nicht mehr, der Fallback traegt.
        bySource: { youtube: 0, soundcloud: 0, other: 0 },
        streamErrors: 0,
        errorsByReason: {},
        soundcloudFallbacks: 0,
    };

    const probe = {
        healthy: null,          // null = noch nie gelaufen
        lastRun: null,
        lastOkAt: null,
        lastMs: null,
        lastError: null,
        consecutiveFailures: 0,
        runs: 0,
    };

    let timer = null;
    let stopped = false;
    let running = false;

    const sourceOf = (url = '') => /youtube\.com|youtu\.be/i.test(url) ? 'youtube'
        : /soundcloud\.com/i.test(url) ? 'soundcloud' : 'other';

    // ── Passive Zaehler ───────────────────────────────────────────
    function recordTrackStart({ firstAudioMs, url } = {}) {
        metrics.trackStarts++;
        if (typeof firstAudioMs === 'number') metrics.firstAudioMs.push(firstAudioMs);
        metrics.bySource[sourceOf(url)]++;
    }
    function recordSearch(ms) { if (typeof ms === 'number') metrics.searchMs.push(ms); }
    function recordStreamError(reason = 'unbekannt') {
        metrics.streamErrors++;
        const key = String(reason).slice(0, 60);
        metrics.errorsByReason[key] = (metrics.errorsByReason[key] || 0) + 1;
    }
    function recordSoundcloudFallback() { metrics.soundcloudFallbacks++; }

    // ── Synthetische Probe ────────────────────────────────────────
    // Erfolgreich = es kamen echte Audio-Bytes. Nicht "der Prozess endete mit 0":
    // yt-dlp beendet sich auch sauber, wenn es gar nichts geladen hat.
    function runProbe() {
        return new Promise((resolve) => {
            const started = Date.now();
            let bytes = 0;
            let stderr = '';
            let settled = false;
            let proc;

            const finish = (ok, error) => {
                if (settled) return;
                settled = true;
                clearTimeout(killer);
                try { if (proc && !proc.killed) proc.kill(); } catch { /* egal */ }
                resolve({ ok, ms: Date.now() - started, bytes, error: error || null });
            };

            const killer = setTimeout(() => finish(false, `Zeitueberschreitung nach ${timeoutMs} ms`), timeoutMs);
            killer.unref?.();

            try {
                proc = spawn(ytdlpPath, buildProbeArgs(probeUrl));
            } catch (e) {
                return finish(false, `yt-dlp nicht startbar: ${e.message}`);
            }

            proc.stdout.on('data', (chunk) => {
                bytes += chunk.length;
                if (bytes >= PROBE_BYTES) finish(true);
            });
            proc.stdout.on('error', () => { /* Pipe nach kill() */ });
            proc.stderr?.on('data', (d) => { stderr += d.toString(); });
            proc.on('error', (e) => finish(false, e.message));
            proc.on('close', () => {
                if (bytes >= PROBE_BYTES) return finish(true);
                const lastLine = stderr.trim().split('\n').filter(Boolean).pop();
                finish(false, lastLine ? lastLine.slice(0, 200) : `nur ${bytes} Bytes erhalten`);
            });
        });
    }

    async function cycle() {
        if (stopped || running) return;
        running = true;
        try {
            const result = await runProbe();
            const wasHealthy = probe.healthy;

            probe.runs++;
            probe.lastRun = new Date();
            probe.lastMs = result.ms;

            if (result.ok) {
                probe.consecutiveFailures = 0;
                probe.lastOkAt = new Date();
                probe.lastError = null;
                probe.healthy = true;
                onLog(`[health] Kette ok — ${result.bytes} Bytes in ${result.ms} ms`);
                // Nur beim Uebergang melden, nicht bei jedem Erfolg.
                if (wasHealthy === false) {
                    notifyInfo('Wiedergabe-Kette wieder da',
                        `Nach ${probe.runs} Proben liefert YouTube wieder Audio (${result.ms} ms).`);
                }
            } else {
                probe.consecutiveFailures++;
                probe.lastError = result.error;
                onLog(`[health] Kette FEHLER (${probe.consecutiveFailures}x): ${result.error}`);
                if (probe.consecutiveFailures >= FAILURES_BEFORE_ALERT) {
                    probe.healthy = false;
                    // notifyError dedupliziert selbst — hier kein eigener Flutschutz noetig.
                    if (wasHealthy !== false) {
                        notifyError('Wiedergabe-Kette gestoert',
                            new Error(result.error || 'unbekannt'),
                            `${probe.consecutiveFailures} Proben in Folge ohne Audio. `
                            + 'Pruefen: Heim-Tunnel (ssh -R auf dem Pi), POT-Provider, yt-dlp-Version.');
                    }
                }
            }
            schedule(result.ok ? intervalMs : retryMs);
        } catch (e) {
            onLog(`[health] Probe abgebrochen: ${e.message}`);
            schedule(retryMs);
        } finally {
            running = false;
        }
    }

    function schedule(ms) {
        if (stopped) return;
        clearTimeout(timer);
        timer = setTimeout(cycle, ms);
        timer.unref?.();
    }

    // ── Bericht ───────────────────────────────────────────────────
    function getHealth() {
        const played = metrics.bySource.youtube + metrics.bySource.soundcloud + metrics.bySource.other;
        return {
            chain: {
                // null, solange die erste Probe laeuft — nicht als "kaputt" melden.
                healthy: probe.healthy,
                lastRun: probe.lastRun,
                lastOkAt: probe.lastOkAt,
                lastMs: probe.lastMs,
                lastError: probe.lastError,
                consecutiveFailures: probe.consecutiveFailures,
                runs: probe.runs,
                intervalMs,
            },
            playback: {
                trackStarts: metrics.trackStarts,
                firstAudioP50Ms: metrics.firstAudioMs.percentile(0.5),
                firstAudioP95Ms: metrics.firstAudioMs.percentile(0.95),
                searchP50Ms: metrics.searchMs.percentile(0.5),
                bySource: { ...metrics.bySource },
                // Der eigentliche Fruehindikator.
                soundcloudShare: played ? Number((metrics.bySource.soundcloud / played).toFixed(3)) : 0,
                soundcloudFallbacks: metrics.soundcloudFallbacks,
                streamErrors: metrics.streamErrors,
                errorsByReason: { ...metrics.errorsByReason },
            },
        };
    }

    // Kurzfassung fuer den #status-Post.
    function statusLine() {
        const h = getHealth();
        if (h.chain.healthy === null) return '⏳ wird geprüft';
        if (h.chain.healthy) return `🟢 ok (${h.chain.lastMs} ms)`;
        return `🔴 gestört — ${h.chain.lastError || 'unbekannt'}`;
    }

    return {
        start() { schedule(0); return this; },
        stop() { stopped = true; clearTimeout(timer); },
        runProbeNow: () => { clearTimeout(timer); return cycle(); },
        recordTrackStart, recordSearch, recordStreamError, recordSoundcloudFallback,
        getHealth, statusLine,
        _metrics: metrics,
        _probe: probe,
    };
}

module.exports = { createHealthMonitor, PROBE_URL, PROBE_INTERVAL_MS, FAILURES_BEFORE_ALERT };

// String-Katalog Deutsch (EarTastic). Default-Sprache — jeder Key MUSS hier existieren.
// Werte: String mit {var} oder Funktion (vars) => String (Plural-/Bedingungslogik).
module.exports = {
    // ── /language ──
    'language.set': '✅ Sprache auf **Deutsch** gestellt.',

    // ── Soundboard-Panel (Handler) ──
    'sb.title.predefined': 'Soundboard - Vorgegebene Sounds',
    'sb.title.all': 'Soundboard - Alle Sounds',
    'sb.title.favorites': 'Soundboard - Favoriten',
    'sb.title.default': 'Soundboard',
    'sb.desc.predefined': 'Klicke auf einen Button um den Sound abzuspielen!',
    'sb.desc.all': (v) => `Alle verfügbaren Sounds (${v.n})`,
    'sb.desc.favorites': 'Deine Lieblingssounds',
    'sb.empty': 'Keine Sounds vorhanden. Nutze `/dashboard` um Sounds hinzuzufügen!',
    'sb.footer': (v) => `Seite ${v.page}/${v.total} | ${v.n} Sounds`,
    'sb.categoryPlaceholder': 'Kategorie wählen...',
    'sb.opt.predefined': 'Vorgegebene Sounds',
    'sb.opt.all': 'Alle Sounds',
    'sb.opt.favorites': 'Favoriten',
    'sb.btn.stop': 'Stop',
    'sb.btn.refresh': 'Aktualisieren',

    // ── Button-Aktionen (Handler) ──
    'sb.notFound': 'Sound nicht gefunden.',
    'sb.rateLimit': 'Warte kurz bevor du den nächsten Sound abspielst.',
    'sb.voiceRequired': 'Du musst in einem Voice-Channel sein!',
    'sb.playError': 'Fehler beim Abspielen des Sounds.',
    'sb.stopped': 'Sound gestoppt.',
    'sb.favAdded': 'Zu Favoriten hinzugefügt!',
    'sb.favRemoved': 'Aus Favoriten entfernt.',

    // ── Allgemein ──
    'error.generic': 'Ein Fehler ist aufgetreten.',

    // ── /sound ──
    'sound.notFound': (v) => `Sound **${v.name}** nicht gefunden.`,
    'sound.playing': (v) => `Spiele **${v.name}** ab...`,

    // ── /favorite ──
    'favorite.removed': (v) => `**${v.name}** aus Favoriten entfernt.`,
    'favorite.added': (v) => `**${v.name}** zu Favoriten hinzugefügt! ⭐`,

    // ── /volume ──
    'volume.set': (v) => `Lautstärke auf **${v.percent}%** gesetzt\n${v.bar}`,

    // ── /dashboard ──
    'dashboard.text': 'Verwalte deine Sounds im Web-Dashboard:',
    'dashboard.btn': 'Dashboard öffnen',

    // ── /invite ──
    'invite.title': '➕ ByteBots einladen',
    'invite.desc': 'Hol dir die **ByteBots** auf deinen Server — kostenlos:\n\n🎵 **BeatByte** — Musik-Bot mit Web-Player\n🔊 **EarTastic** — Soundboard mit Web-Dashboard\n🛡️ **ByteBots Admin** — Server-Verwaltung *(in Entwicklung)*',

    // ── /support ──
    'support.desc': 'Fragen, Bug gefunden oder eine Idee?\nKomm auf den **ByteBots Support-Server** — dort helfen wir dir weiter und sammeln Feedback.',
    'support.join': 'Support-Server beitreten',
};

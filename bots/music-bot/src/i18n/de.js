// String-Katalog Deutsch (BeatByte). Werte: String mit {var}-Platzhaltern
// oder Funktion (vars) => String (fuer Plural-/Bedingungslogik).
// Default-Sprache — hier MUSS jeder Key existieren (Fallback-Basis fuer en.js).
module.exports = {
    // ── Gemeinsame Labels (Embed-Feldnamen) ──
    'label.songs': 'Songs',
    'label.requestedBy': 'Angefragt von',
    'label.duration': 'Dauer',
    'label.position': 'Position',

    // ── Warteschlangen-Zaehler (Plural) ──
    'queue.count': (v) => `${v.n} Song${v.n !== 1 ? 's' : ''} in der Warteschlange`,

    // ── Checks / allgemeine Fehler ──
    'checks.voiceRequired': '❌ Du musst in einem Voice Channel sein!',
    'checks.nothingPlaying': '❌ Es wird gerade nichts abgespielt.',
    'error.commandFailed': '❌ Beim Ausführen des Commands ist ein Fehler aufgetreten.',

    // ── Buttons (Now-Playing-Leiste) ──
    'buttons.mustBeInVoice': '❌ Du musst im Voice Channel sein!',
    'buttons.notEnoughToShuffle': '❌ Nicht genug Songs zum Mischen.',

    // ── /language ──
    'language.set': '✅ Sprache auf **Deutsch** gestellt.',

    // ── /play ──
    'play.playlistAdded': 'Playlist hinzugefügt',
    'play.addedToQueue': 'Zur Warteschlange hinzugefügt',
    'play.loadingMore': (v) => `Lade ${v.n} weitere Songs im Hintergrund...`,
    'play.error': (v) => `❌ ${v.message}`,

    // ── /autodj ──
    'autodj.on': '-# 🤖 Auto-DJ aktiviert',
    'autodj.off': '-# 🤖 Auto-DJ deaktiviert',

    // ── /clear ──
    'clear.empty': '❌ Die Warteschlange ist bereits leer.',
    'clear.cleared': (v) => `-# 🗑️ **${v.n} Song${v.n !== 1 ? 's' : ''}** aus der Warteschlange entfernt`,

    // ── /disconnect ──
    'disconnect.notConnected': '❌ Der Bot ist nicht verbunden.',

    // ── /seek ──
    'seek.invalidFormat': '❌ Ungültiges Format. Nutze z.B. `1:30` oder `90`.',
    'seek.failed': (v) => `❌ Seek fehlgeschlagen: ${v.message}`,
    'seek.jumping': (v) => `-# ⏩ Springe zu **${v.time}**`,

    // ── /skip ──
    'skip.vote': (v) => `-# 🗳️ Skip-Vote: **${v.have}/${v.need}** — noch ${v.remaining} nötig`,

    // ── /volume ──
    'volume.current': (v) => `🔊 Aktuelle Lautstärke: **${v.percent}%**`,
    'volume.set': (v) => `-# 🔊 Lautstärke auf **${v.percent}%** gesetzt`,

    // ── /shuffle ──
    'shuffle.done': (v) => `-# 🔀 **${v.n} Songs** gemischt`,

    // ── /move ──
    'move.empty': '❌ Die Warteschlange ist leer.',
    'move.invalidPos': (v) => `❌ Ungültige Position. Warteschlange hat ${v.n} Songs.`,
    'move.samePos': '❌ Die Positionen sind identisch.',
    'move.moved': (v) => `-# ↕️ **${v.title}** von Position ${v.from} nach ${v.to} verschoben`,

    // ── /remove ──
    'remove.notExist': (v) => `❌ Position ${v.pos} existiert nicht. Warteschlange hat ${v.n} Songs.`,
    'remove.removed': (v) => `-# 🗑️ **${v.title}** von Position ${v.pos} entfernt`,

    // ── /setrole ──
    'setrole.set': (v) => `-# 🎧 DJ-Rolle auf **${v.role}** gesetzt`,
    'setrole.removed': '-# 🎧 DJ-Rolle entfernt',

    // ── /loop ──
    'loop.off': '-# 🔁 Loop deaktiviert',
    'loop.song': '-# 🔂 Song wird wiederholt',
    'loop.queue': '-# 🔁 Queue wird wiederholt',

    // ── /filter ──
    'filter.off': '-# 🎛️ Filter deaktiviert',
    'filter.bassboost': '-# 🎛️ Bassboost aktiviert',
    'filter.nightcore': '-# 🎛️ Nightcore aktiviert',
    'filter.slowed': '-# 🎛️ Slowed aktiviert',

    // ── Now-Playing / Loading (index.js) ──
    'np.nowPlaying': 'Spielt jetzt',
    'np.paused': '⏸ Pausiert',
    'np.inQueue': (v) => `${v.n} in Warteschlange`,
    'np.loadingTitle': 'Lädt…',
    'np.loadingLine': '-# ⏳ Wird geladen…',

    // ── /queue ──
    'queue.nowPlaying': '**▶️ Spielt jetzt:**',
    'queue.upNext': '**Nächste Songs:**',
    'queue.andMore': (v) => `*...und ${v.n} weitere*`,
    'queue.noMore': '*Keine weiteren Songs in der Warteschlange.*',
    'queue.title': 'Warteschlange',

    // ── /lyrics ──
    'lyrics.noSong': '❌ Kein Song angegeben und es wird nichts abgespielt.',
    'lyrics.title': 'Lyrics',
    'lyrics.body': (v) => `**${v.query}**\n\nLyrics können aus rechtlichen Gründen nicht direkt angezeigt werden.\n\n[Google Suche](${v.searchUrl})\n[Genius](${v.geniusUrl})\n[AZLyrics](${v.azUrl})`,

    // ── /invite ──
    'invite.title': '➕ ByteBots einladen',
    'invite.desc': 'Hol dir die **ByteBots** auf deinen Server — kostenlos:\n\n🎵 **BeatByte** — Musik-Bot mit Web-Player\n🔊 **EarTastic** — Soundboard mit Web-Dashboard\n🛡️ **ByteBots Admin** — Server-Verwaltung *(in Entwicklung)*',

    // ── /support ──
    'support.desc': 'Fragen, Bug gefunden oder eine Idee?\nKomm auf den **ByteBots Support-Server** — dort helfen wir dir weiter und sammeln Feedback.',
    'support.join': 'Support-Server beitreten',

    // ── /app ──
    'app.desc': (v) => `### Dein Zugangs-Code\n# \`${v.code}\`\n\nÖffne den Music Player und gib diesen Code ein, um dich zu verbinden.\n\nDer Code ist **7 Tage** gültig.`,
    'app.footer': 'Nur für dich sichtbar',
    'app.openPlayer': 'Player öffnen',

    // ── /playlist ──
    'word.songs': (v) => `Song${v.n !== 1 ? 's' : ''}`,
    'playlist.noSongs': '❌ Keine Songs zum Speichern vorhanden.',
    'playlist.max200': '❌ Maximal 200 Songs pro Playlist.',
    'playlist.exists': (v) => `❌ Du hast bereits eine Playlist namens **${v.name}**.`,
    'playlist.saveError': '❌ Fehler beim Speichern der Playlist.',
    'playlist.saved': 'Playlist gespeichert',
    'playlist.nameCount': (v) => `**${v.name}** — ${v.n} Song${v.n !== 1 ? 's' : ''}`,
    'playlist.loadHint': (v) => `Lade mit /playlist load ${v.name}`,
    'playlist.notFound': (v) => `❌ Playlist **${v.name}** nicht gefunden.`,
    'playlist.empty': '❌ Diese Playlist ist leer.',
    'playlist.loaded': 'Playlist geladen',
    'playlist.loadedDesc': (v) => `**${v.name}** — ${v.n} Song${v.n !== 1 ? 's' : ''} zur Queue hinzugefügt`,
    'playlist.noneYet': 'Du hast noch keine Playlists gespeichert.\nNutze `/playlist save <name>` um die aktuelle Queue zu speichern.',
    'playlist.yours': 'Deine Playlists',
    'playlist.count': (v) => `${v.n} Playlist${v.n !== 1 ? 's' : ''}`,
    'playlist.emptyLabel': 'Leer',
    'playlist.deleted': (v) => `-# 🗑️ Playlist **${v.name}** gelöscht`,
    'playlist.invalidUrl': '❌ Ungültige Playlist-URL. Unterstützt: Spotify, Apple Music, Deezer, Amazon Music, YouTube.',
    'playlist.noTracks': '❌ Konnte keine Songs aus dieser Playlist laden.',
    'playlist.existsHint': (v) => `❌ Du hast bereits eine Playlist namens **${v.name}**. Wähle einen anderen Namen mit der \`name\` Option.`,
    'playlist.imported': 'Playlist importiert',
};

// String catalog English (EarTastic). Same keys as de.js; missing keys fall back to German.
module.exports = {
    // ── /language ──
    'language.set': '✅ Language set to **English**.',

    // ── Soundboard panel (handler) ──
    'sb.title.predefined': 'Soundboard - Preset sounds',
    'sb.title.all': 'Soundboard - All sounds',
    'sb.title.favorites': 'Soundboard - Favorites',
    'sb.title.default': 'Soundboard',
    'sb.desc.predefined': 'Click a button to play the sound!',
    'sb.desc.all': (v) => `All available sounds (${v.n})`,
    'sb.desc.favorites': 'Your favorite sounds',
    'sb.empty': 'No sounds yet. Use `/dashboard` to add sounds!',
    'sb.footer': (v) => `Page ${v.page}/${v.total} | ${v.n} sounds`,
    'sb.categoryPlaceholder': 'Choose a category...',
    'sb.opt.predefined': 'Preset sounds',
    'sb.opt.all': 'All sounds',
    'sb.opt.favorites': 'Favorites',
    'sb.btn.stop': 'Stop',
    'sb.btn.refresh': 'Refresh',

    // ── Button actions (handler) ──
    'sb.notFound': 'Sound not found.',
    'sb.rateLimit': 'Wait a moment before playing the next sound.',
    'sb.voiceRequired': 'You must be in a voice channel!',
    'sb.playError': 'Error playing the sound.',
    'sb.stopped': 'Sound stopped.',
    'sb.favAdded': 'Added to favorites!',
    'sb.favRemoved': 'Removed from favorites.',

    // ── General ──
    'error.generic': 'An error occurred.',

    // ── /sound ──
    'sound.notFound': (v) => `Sound **${v.name}** not found.`,
    'sound.playing': (v) => `Playing **${v.name}**...`,

    // ── /favorite ──
    'favorite.removed': (v) => `**${v.name}** removed from favorites.`,
    'favorite.added': (v) => `**${v.name}** added to favorites! ⭐`,

    // ── /volume ──
    'volume.set': (v) => `Volume set to **${v.percent}%**\n${v.bar}`,

    // ── /dashboard ──
    'dashboard.text': 'Manage your sounds in the web dashboard:',
    'dashboard.btn': 'Open dashboard',

    // ── /invite ──
    'invite.title': '➕ Invite ByteBots',
    'invite.desc': 'Get the **ByteBots** on your server — for free:\n\n🎵 **BeatByte** — music bot with web player\n🔊 **EarTastic** — soundboard with web dashboard\n🛡️ **ByteBots Admin** — server management *(in development)*',

    // ── /support ──
    'support.desc': 'Questions, found a bug or have an idea?\nJoin the **ByteBots support server** — we\'ll help you out and collect feedback.',
    'support.join': 'Join support server',
};

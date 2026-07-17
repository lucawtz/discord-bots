// String catalog English (BeatByte). Same keys as de.js; missing keys fall back to German.
module.exports = {
    // ── Shared labels (embed field names) ──
    'label.songs': 'Songs',
    'label.requestedBy': 'Requested by',
    'label.duration': 'Duration',
    'label.position': 'Position',

    // ── Queue counter (plural) ──
    'queue.count': (v) => `${v.n} song${v.n !== 1 ? 's' : ''} in the queue`,

    // ── Checks / general errors ──
    'checks.voiceRequired': '❌ You must be in a voice channel!',
    'checks.nothingPlaying': '❌ Nothing is playing right now.',
    'error.commandFailed': '❌ An error occurred while running the command.',

    // ── Buttons (now-playing bar) ──
    'buttons.mustBeInVoice': '❌ You must be in the voice channel!',
    'buttons.notEnoughToShuffle': '❌ Not enough songs to shuffle.',

    // ── /language ──
    'language.set': '✅ Language set to **English**.',

    // ── /play ──
    'play.playlistAdded': 'Playlist added',
    'play.addedToQueue': 'Added to queue',
    'play.loadingMore': (v) => `Loading ${v.n} more songs in the background...`,
    'play.error': (v) => `❌ ${v.message}`,

    // ── /autodj ──
    'autodj.on': '-# 🤖 Auto-DJ enabled',
    'autodj.off': '-# 🤖 Auto-DJ disabled',

    // ── /clear ──
    'clear.empty': '❌ The queue is already empty.',
    'clear.cleared': (v) => `-# 🗑️ **${v.n} song${v.n !== 1 ? 's' : ''}** removed from the queue`,

    // ── /disconnect ──
    'disconnect.notConnected': '❌ The bot is not connected.',

    // ── /seek ──
    'seek.invalidFormat': '❌ Invalid format. Use e.g. `1:30` or `90`.',
    'seek.failed': (v) => `❌ Seek failed: ${v.message}`,
    'seek.jumping': (v) => `-# ⏩ Jumping to **${v.time}**`,

    // ── /skip ──
    'skip.vote': (v) => `-# 🗳️ Skip vote: **${v.have}/${v.need}** — ${v.remaining} more needed`,

    // ── /volume ──
    'volume.current': (v) => `🔊 Current volume: **${v.percent}%**`,
    'volume.set': (v) => `-# 🔊 Volume set to **${v.percent}%**`,

    // ── /shuffle ──
    'shuffle.done': (v) => `-# 🔀 **${v.n} songs** shuffled`,

    // ── /move ──
    'move.empty': '❌ The queue is empty.',
    'move.invalidPos': (v) => `❌ Invalid position. The queue has ${v.n} songs.`,
    'move.samePos': '❌ The positions are identical.',
    'move.moved': (v) => `-# ↕️ **${v.title}** moved from position ${v.from} to ${v.to}`,

    // ── /remove ──
    'remove.notExist': (v) => `❌ Position ${v.pos} does not exist. The queue has ${v.n} songs.`,
    'remove.removed': (v) => `-# 🗑️ **${v.title}** removed from position ${v.pos}`,

    // ── /setrole ──
    'setrole.set': (v) => `-# 🎧 DJ role set to **${v.role}**`,
    'setrole.removed': '-# 🎧 DJ role removed',

    // ── /loop ──
    'loop.off': '-# 🔁 Loop disabled',
    'loop.song': '-# 🔂 Repeating the song',
    'loop.queue': '-# 🔁 Repeating the queue',

    // ── /filter ──
    'filter.off': '-# 🎛️ Filter disabled',
    'filter.bassboost': '-# 🎛️ Bassboost enabled',
    'filter.nightcore': '-# 🎛️ Nightcore enabled',
    'filter.slowed': '-# 🎛️ Slowed enabled',

    // ── Now-Playing / Loading (index.js) ──
    'np.nowPlaying': 'Now playing',
    'np.paused': '⏸ Paused',
    'np.inQueue': (v) => `${v.n} in queue`,
    'np.loadingTitle': 'Loading…',
    'np.loadingLine': '-# ⏳ Loading…',

    // ── /queue ──
    'queue.nowPlaying': '**▶️ Now playing:**',
    'queue.upNext': '**Up next:**',
    'queue.andMore': (v) => `*...and ${v.n} more*`,
    'queue.noMore': '*No more songs in the queue.*',
    'queue.title': 'Queue',

    // ── /lyrics ──
    'lyrics.noSong': '❌ No song given and nothing is playing.',
    'lyrics.title': 'Lyrics',
    'lyrics.body': (v) => `**${v.query}**\n\nLyrics can't be shown directly for legal reasons.\n\n[Google search](${v.searchUrl})\n[Genius](${v.geniusUrl})\n[AZLyrics](${v.azUrl})`,

    // ── /invite ──
    'invite.title': '➕ Invite ByteBots',
    'invite.desc': 'Get the **ByteBots** on your server — for free:\n\n🎵 **BeatByte** — music bot with web player\n🔊 **EarTastic** — soundboard with web dashboard\n🛡️ **ByteBots Admin** — server management *(in development)*',

    // ── /support ──
    'support.desc': 'Questions, found a bug or have an idea?\nJoin the **ByteBots support server** — we\'ll help you out and collect feedback.',
    'support.join': 'Join support server',

    // ── /app ──
    'app.desc': (v) => `### Your access code\n# \`${v.code}\`\n\nOpen the music player and enter this code to connect.\n\nThe code is valid for **7 days**.`,
    'app.footer': 'Only visible to you',
    'app.openPlayer': 'Open player',

    // ── /playlist ──
    'word.songs': (v) => `song${v.n !== 1 ? 's' : ''}`,
    'playlist.noSongs': '❌ No songs available to save.',
    'playlist.max200': '❌ Maximum 200 songs per playlist.',
    'playlist.exists': (v) => `❌ You already have a playlist named **${v.name}**.`,
    'playlist.saveError': '❌ Error saving the playlist.',
    'playlist.saved': 'Playlist saved',
    'playlist.nameCount': (v) => `**${v.name}** — ${v.n} song${v.n !== 1 ? 's' : ''}`,
    'playlist.loadHint': (v) => `Load with /playlist load ${v.name}`,
    'playlist.notFound': (v) => `❌ Playlist **${v.name}** not found.`,
    'playlist.empty': '❌ This playlist is empty.',
    'playlist.loaded': 'Playlist loaded',
    'playlist.loadedDesc': (v) => `**${v.name}** — ${v.n} song${v.n !== 1 ? 's' : ''} added to the queue`,
    'playlist.noneYet': 'You don\'t have any saved playlists yet.\nUse `/playlist save <name>` to save the current queue.',
    'playlist.yours': 'Your playlists',
    'playlist.count': (v) => `${v.n} playlist${v.n !== 1 ? 's' : ''}`,
    'playlist.emptyLabel': 'Empty',
    'playlist.deleted': (v) => `-# 🗑️ Playlist **${v.name}** deleted`,
    'playlist.invalidUrl': '❌ Invalid playlist URL. Supported: Spotify, Apple Music, Deezer, Amazon Music, YouTube.',
    'playlist.noTracks': '❌ Could not load any songs from this playlist.',
    'playlist.existsHint': (v) => `❌ You already have a playlist named **${v.name}**. Choose a different name with the \`name\` option.`,
    'playlist.imported': 'Playlist imported',
};

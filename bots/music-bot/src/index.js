const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const { spawn, execFileSync } = require('child_process'); // execFileSync für yt-dlp detection


const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { startAPI } = require('./api');

// ── Konstanten ────────────────────────────────────────────────────
const DELETE_SHORT_MS = 30_000;     // 30 Sekunden (skip, pause, stop, join)
const DELETE_EMBED_MS = 60_000;     // 60 Sekunden (play, queue, nowplaying)
const DELETE_ERROR_MS = 10_000;     // 10 Sekunden (Fehler)
const LEAVE_TIMEOUT_MS = 5 * 60_000; // 5 Minuten
const CONNECT_TIMEOUT_MS = 30_000;  // 30 Sekunden
const DISCONNECT_CHECK_MS = 5_000;  // 5 Sekunden

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// ── Queue-Verwaltung ──────────────────────────────────────────────
const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            tracks: [],
            current: null,
            player: null,
            connection: null,
            channel: null,
            processes: new Set(),
            playLock: false,
            stopped: false,
            leaveTimer: null,
            loopMode: 'off',      // off, song, queue
            volume: 1.0,
            skipVotes: new Set(),
        });
    }
    return queues.get(guildId);
}

function destroyQueue(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);
    if (queue._nowPlayingMsg) queue._nowPlayingMsg.delete().catch(() => {});
    for (const proc of queue.processes) {
        if (!proc.killed) proc.kill();
    }
    queue.processes.clear();
    queue.tracks = [];
    queue.current = null;
    if (queue.player) {
        queue.player.removeAllListeners();
        queue.player.stop(true);
    }
    if (queue.connection) {
        queue.connection.removeAllListeners();
        queue.connection.destroy();
    }
    queues.delete(guildId);
}

// ── yt-dlp ────────────────────────────────────────────────────────
let ytdlpPath;
try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
    ytdlpPath = 'yt-dlp';
} catch {
    const ytdlpBin = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    ytdlpPath = path.join(path.dirname(require.resolve('youtube-dl-exec')), '..', 'bin', ytdlpBin);
}
console.log(`yt-dlp: ${ytdlpPath}`);

// ── FFmpeg ────────────────────────────────────────────────────────
let ffmpegPath;
try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    ffmpegPath = 'ffmpeg';
} catch {
    try { ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; }
    catch { ffmpegPath = 'ffmpeg'; }
}
console.log(`ffmpeg: ${ffmpegPath}`);

// ── Cookies (optional, für YouTube-Stabilität) ───────────────────
const cookieArgs = [];
const cookiePath = path.join(__dirname, '..', 'cookies.txt');
if (fs.existsSync(cookiePath)) {
    cookieArgs.push('--cookies', cookiePath);
    console.log('yt-dlp: cookies.txt geladen');
} else {
    console.log('yt-dlp: Keine cookies.txt gefunden (optional)');
}

// ── yt-dlp Auto-Update (im Hintergrund, blockiert nicht den Start) ──
spawn(ytdlpPath, ['-U']).on('close', (code) => {
    if (code === 0) console.log('yt-dlp: Update geprüft');
});

async function searchTrack(query) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const searchQuery = isUrl ? query : `ytsearch1:${query}`;

    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, searchQuery,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const info = data.entries ? data.entries[0] : data;
                if (!info) return reject(new Error('Kein Ergebnis gefunden'));
                resolve({
                    title: info.title || 'Unbekannter Titel',
                    url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                    duration: formatDuration(info.duration),
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                });
            } catch {
                reject(new Error('Konnte Song-Info nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

async function searchTracks(query, limit = 5) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        const track = await searchTrack(query);
        return [track];
    }

    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--no-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, `ytsearch${limit}:${query}`,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const entries = data.entries || [data];
                resolve(entries.filter(i => i).map(info => ({
                    title: info.title || 'Unbekannter Titel',
                    url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                    duration: formatDuration(info.duration),
                    thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                })));
            } catch {
                reject(new Error('Konnte Suchergebnisse nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

async function searchPlaylist(url) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
            '--dump-single-json', '--yes-playlist', '--no-check-certificates',
            '--no-warnings', '--flat-playlist', '--force-ipv4',
            ...cookieArgs, url,
        ]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d);
        proc.stderr.on('data', (d) => stderr += d);
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
            try {
                const data = JSON.parse(stdout);
                const entries = data.entries || [];
                if (entries.length === 0) return reject(new Error('Leere Playlist'));
                resolve({
                    title: data.title || 'Unbekannte Playlist',
                    tracks: entries.filter(i => i).map(info => ({
                        title: info.title || 'Unbekannter Titel',
                        url: info.webpage_url || info.url || `https://www.youtube.com/watch?v=${info.id}`,
                        duration: formatDuration(info.duration),
                        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
                    })),
                });
            } catch {
                reject(new Error('Konnte Playlist nicht parsen'));
            }
        });
        proc.on('error', (e) => reject(new Error(`yt-dlp konnte nicht gestartet werden: ${e.message}`)));
    });
}

function isPlaylistUrl(url) {
    return url.includes('list=') || url.includes('/playlist') || url.includes('/album');
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── Audio-Stream (yt-dlp → FFmpeg → OggOpus) ────────────────────
function createStream(url, queue, onError) {
    const ytdlp = spawn(ytdlpPath, [
        '-f', 'bestaudio',
        '-o', '-', '--no-check-certificates', '--no-warnings',
        '--force-ipv4', '--retries', '3', '--extractor-retries', '3',
        ...cookieArgs, url,
    ]);

    const ffmpeg = spawn(ffmpegPath, [
        '-i', 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', 'error',
        '-f', 'ogg',
        '-acodec', 'libopus',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ]);

    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdin.on('error', () => {}); // Broken pipe ignorieren

    let hasData = false;
    let stderrOutput = '';
    ffmpeg.stdout.on('data', () => { hasData = true; });

    ytdlp.stderr.on('data', (d) => { stderrOutput += d.toString(); });
    ytdlp.on('close', (code) => {
        queue.processes.delete(ytdlp);
        if (stderrOutput.trim()) console.error('yt-dlp stderr:', stderrOutput.trim());
        if (code !== 0 && !hasData) {
            ffmpeg.kill();
            const lastLine = stderrOutput.trim().split('\n').pop();
            onError?.(new Error(lastLine || `yt-dlp Fehler (Code ${code})`));
        }
    });

    ffmpeg.stderr.on('data', (d) => console.error('ffmpeg stderr:', d.toString().trim()));
    ffmpeg.on('close', () => { queue.processes.delete(ffmpeg); });

    ytdlp.on('error', (e) => { console.error('yt-dlp spawn error:', e.message); onError?.(e); });
    ffmpeg.on('error', (e) => { console.error('ffmpeg spawn error:', e.message); onError?.(e); });

    queue.processes.add(ytdlp);
    queue.processes.add(ffmpeg);
    return ffmpeg.stdout;
}

// ── Voice-Verbindung herstellen ───────────────────────────────────
async function ensureConnection(interaction, ctx) {
    const queue = ctx.getQueue(interaction.guild.id);
    const channel = interaction.member.voice.channel;
    if (!channel) throw new Error('Du bist in keinem Voice Channel!');

    // Bestehende Timer abbrechen
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);
    queue.leaveTimer = null;
    queue.stopped = false;

    if (queue.connection && queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return queue;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queue.connection = connection;
    queue.player = player;
    queue.channel = interaction.channel;

    // Player Events (einmalig pro Connection)
    player.on(AudioPlayerStatus.Idle, () => {
        // Kurzer Delay damit der yt-dlp 'close' Event vor playNext feuert
        setTimeout(() => playNext(interaction.guild.id), 200);
    });

    player.on('error', (error) => {
        console.error('Player error:', error.message);
        autoDelete(queue.channel?.send(`❌ Wiedergabefehler: ${error.message}`), DELETE_ERROR_MS);
        playNext(interaction.guild.id);
    });

    // State-Änderungen an Desktop App senden
    player.on('stateChange', (oldState, newState) => {
        if (oldState.status !== newState.status) {
            ctx.broadcast('stateUpdate', ctx.getGuildState(interaction.guild.id));
        }
    });

    // Disconnect-Handling
    connection.on(VoiceConnectionStatus.Disconnected, () => {
        setTimeout(() => {
            if (!queue.connection) return;
            if (queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
                destroyQueue(interaction.guild.id);
            }
        }, DISCONNECT_CHECK_MS);
    });

    // Warten bis Connection ready
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                connection.removeAllListeners('stateChange');
                reject(new Error('Voice-Verbindung konnte nicht hergestellt werden'));
            }, CONNECT_TIMEOUT_MS);

            const onStateChange = (_, newState) => {
                if (newState.status === VoiceConnectionStatus.Ready) {
                    clearTimeout(timeout);
                    connection.removeListener('stateChange', onStateChange);
                    resolve();
                }
            };
            connection.on('stateChange', onStateChange);
        });
    }

    return queue;
}

// ── Leave-Timer starten ───────────────────────────────────────────
function scheduleLeave(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;
    clearTimeout(queue.leaveTimer);
    clearTimeout(queue._leaveWarningTimer);

    // Kurz vor Leave eine Nachricht senden
    const warningMs = Math.max(LEAVE_TIMEOUT_MS - 5_000, 0);
    queue._leaveWarningTimer = setTimeout(() => {
        const q = queues.get(guildId);
        if (q && !q.current && !q.stopped && q.channel) {
            q.channel.send('👋 Ciao!')
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10_000))
                .catch(() => {});
        }
    }, warningMs);

    queue.leaveTimer = setTimeout(() => {
        const q = queues.get(guildId);
        if (q && !q.current) destroyQueue(guildId);
    }, LEAVE_TIMEOUT_MS);
}

// ── Voice-Channel beitreten (für Desktop App) ───────────────────
async function joinChannel(guildId, channelId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Server nicht gefunden');

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) throw new Error('Voice Channel nicht gefunden');

    const queue = getQueue(guildId);
    clearTimeout(queue.leaveTimer);
    queue.leaveTimer = null;
    queue.stopped = false;

    if (queue.connection && queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return queue;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    queue.connection = connection;
    queue.player = player;

    player.on(AudioPlayerStatus.Idle, () => {
        setTimeout(() => playNext(guildId), 200);
    });

    player.on('error', (error) => {
        console.error('Player error:', error.message);
        playNext(guildId);
    });

    player.on('stateChange', (oldState, newState) => {
        if (oldState.status !== newState.status) {
            ctx.broadcast('stateUpdate', ctx.getGuildState(guildId));
        }
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        setTimeout(() => {
            if (!queue.connection) return;
            if (queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
                destroyQueue(guildId);
            }
        }, DISCONNECT_CHECK_MS);
    });

    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                connection.removeAllListeners('stateChange');
                reject(new Error('Voice-Verbindung fehlgeschlagen'));
            }, CONNECT_TIMEOUT_MS);

            const onStateChange = (_, newState) => {
                if (newState.status === VoiceConnectionStatus.Ready) {
                    clearTimeout(timeout);
                    connection.removeListener('stateChange', onStateChange);
                    resolve();
                }
            };
            connection.on('stateChange', onStateChange);
        });
    }

    return queue;
}

// ── Wiedergabe ────────────────────────────────────────────────────
async function playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.playLock) return;

    queue.playLock = true;
    try {
        // Alte Prozesse beenden
        for (const proc of queue.processes) {
            if (!proc.killed) proc.kill();
        }
        queue.processes.clear();

        // Fehlgeschlagenen Track erneut versuchen (1x Retry)
        if (queue._failedTrack) {
            const retry = queue._failedTrack;
            queue._failedTrack = null;
            queue.tracks.unshift(retry);
        }

        // Loop: Song wiederholen
        if (queue.loopMode === 'song' && queue.current && !queue._failedTrack) {
            queue.tracks.unshift({ ...queue.current, _retried: false });
        }
        // Loop: Queue wiederholen (current ans Ende)
        if (queue.loopMode === 'queue' && queue.current && !queue._failedTrack) {
            queue.tracks.push({ ...queue.current, _retried: false });
        }

        if (queue.tracks.length === 0) {
            queue.current = null;
            queue.stopped = false;
            scheduleLeave(guildId);
            return;
        }

        // Alte "Now Playing"-Nachricht löschen
        if (queue._nowPlayingMsg) {
            queue._nowPlayingMsg.delete().catch(() => {});
            queue._nowPlayingMsg = null;
        }

        const track = queue.tracks.shift();
        queue.current = track;
        queue.skipVotes.clear();
        queue._playbackStart = Date.now();
        queue._seekOffset = 0;

        const stream = createStream(track.url, queue, (err) => {
            if (!track._retried) {
                track._retried = true;
                queue._failedTrack = track;
                console.error(`Stream-Fehler bei "${track.title}", Retry wird versucht...`);
            } else {
                autoDelete(queue.channel?.send(`❌ Stream-Fehler bei **${track.title}**: ${err.message}`), DELETE_ERROR_MS);
            }
        });
        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        queue._resource = resource;
        queue.player.play(resource);

        // "Now Playing"-Nachricht mit Buttons senden
        if (queue.channel) {
            const loopLabel = queue.loopMode === 'song' ? '🔂' : queue.loopMode === 'queue' ? '🔁' : '➡️';
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('music_pause').setEmoji('⏯️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_loop').setEmoji(loopLabel).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
            );
            const npEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Spielt jetzt' })
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: 'Dauer', value: `\`${track.duration}\``, inline: true },
                    { name: 'Angefragt von', value: track.requestedBy || '—', inline: true },
                )
                .setColor(0x5865F2);
            if (queue.loopMode !== 'off') {
                npEmbed.setFooter({ text: queue.loopMode === 'song' ? '🔂 Song-Loop' : '🔁 Queue-Loop' });
            }
            queue.channel.send({ embeds: [npEmbed], components: [row] })
                .then(msg => { queue._nowPlayingMsg = msg; })
                .catch(() => {});
        }
    } catch (error) {
        console.error('Playback error:', error.message);
        queue.current = null;
        autoDelete(queue.channel?.send(`❌ Fehler beim Abspielen: ${error.message}`), DELETE_ERROR_MS);
        // Nächsten Song versuchen nach kurzem Delay
        setTimeout(() => playNext(guildId), 500);
    } finally {
        queue.playLock = false;
    }
}

// ── Nachrichten mit Auto-Delete senden ────────────────────────────
function autoDelete(msgPromise, ms = DELETE_EMBED_MS) {
    msgPromise
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), ms))
        .catch(() => {});
}

// ── Commands laden ────────────────────────────────────────────────
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

// ── Context-Objekt für Commands ───────────────────────────────────
const ctx = {
    queues, getQueue, destroyQueue, searchTrack, searchTracks, searchPlaylist, isPlaylistUrl,
    playNext, joinChannel, ensureConnection, scheduleLeave, autoDelete, createStream, ffmpegPath,
    AudioPlayerStatus, VoiceConnectionStatus, StreamType,
    DELETE_SHORT_MS, DELETE_EMBED_MS, DELETE_ERROR_MS,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
};

// ── API Broadcast (wird nach API-Start gesetzt) ──────────────
let _apiBroadcast = () => {};
let _apiGetGuildState = () => ({});
ctx.broadcast = (event, data) => _apiBroadcast(event, data);
ctx.getGuildState = (guildId) => _apiGetGuildState(guildId);

// ── Button Handler ────────────────────────────────────────────────
async function handleButton(interaction) {
    const queue = queues.get(interaction.guildId);
    if (!queue || !queue.current) {
        return interaction.reply({ content: '❌ Es wird gerade nichts abgespielt.', ephemeral: true });
    }

    // Prüfen ob User im Voice Channel ist
    if (!interaction.member.voice.channel) {
        return interaction.reply({ content: '❌ Du musst im Voice Channel sein!', ephemeral: true });
    }

    switch (interaction.customId) {
        case 'music_pause':
            if (queue.player.state.status === AudioPlayerStatus.Paused) {
                queue.player.unpause();
                await interaction.reply({ content: '▶️ Fortgesetzt.', ephemeral: true });
            } else {
                queue.player.pause();
                await interaction.reply({ content: '⏸️ Pausiert.', ephemeral: true });
            }
            break;

        case 'music_skip':
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.player.stop();
            await interaction.reply({ content: `⏭️ **${queue.current.title}** übersprungen.`, ephemeral: true });
            break;

        case 'music_stop':
            for (const proc of queue.processes) { if (!proc.killed) proc.kill(); }
            queue.processes.clear();
            queue.tracks = [];
            queue.current = null;
            queue._failedTrack = null;
            queue.stopped = true;
            if (queue._nowPlayingMsg) { queue._nowPlayingMsg.delete().catch(() => {}); queue._nowPlayingMsg = null; }
            if (queue.player) queue.player.stop(true);
            scheduleLeave(interaction.guildId);
            await interaction.reply({ content: '⏹️ Wiedergabe gestoppt.', ephemeral: true });
            break;

        case 'music_shuffle':
            if (queue.tracks.length < 2) {
                return interaction.reply({ content: '❌ Nicht genug Songs zum Mischen.', ephemeral: true });
            }
            for (let i = queue.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
            }
            await interaction.reply({ content: `🔀 ${queue.tracks.length} Songs gemischt!`, ephemeral: true });
            break;

        case 'music_loop': {
            const modes = ['off', 'song', 'queue'];
            const labels = { off: '➡️ Loop aus', song: '🔂 Song-Loop', queue: '🔁 Queue-Loop' };
            const idx = (modes.indexOf(queue.loopMode) + 1) % modes.length;
            queue.loopMode = modes[idx];
            await interaction.reply({ content: labels[queue.loopMode], ephemeral: true });
            // Button auf Now Playing aktualisieren
            if (queue._nowPlayingMsg) {
                const loopEmoji = queue.loopMode === 'song' ? '🔂' : queue.loopMode === 'queue' ? '🔁' : '➡️';
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏯️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_loop').setEmoji(loopEmoji).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
                );
                const embed = EmbedBuilder.from(queue._nowPlayingMsg.embeds[0]);
                if (queue.loopMode !== 'off') {
                    embed.setFooter({ text: queue.loopMode === 'song' ? '🔂 Song-Loop' : '🔁 Queue-Loop' });
                } else {
                    embed.setFooter(null);
                }
                queue._nowPlayingMsg.edit({ embeds: [embed], components: [row] }).catch(() => {});
            }
            break;
        }
    }
}

// ── Interaction Handler ──────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        try { await handleButton(interaction); } catch (e) { console.error('Button error:', e.message); }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, ctx);
    } catch (error) {
        console.error(`Command ${interaction.commandName} error:`, error.message);
        const reply = { content: '❌ Beim Ausführen des Commands ist ein Fehler aufgetreten.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
});

// ── Auto-Pause wenn Voice Channel leer ───────────────────────────
client.on('voiceStateUpdate', (oldState, newState) => {
    const guildId = oldState.guild.id || newState.guild.id;
    const queue = queues.get(guildId);
    if (!queue || !queue.connection || !queue.player) return;

    const botChannel = queue.connection.joinConfig.channelId;
    const channel = oldState.guild.channels.cache.get(botChannel);
    if (!channel) return;

    // Nur echte User zählen (nicht den Bot)
    const members = channel.members.filter(m => !m.user.bot).size;

    if (members === 0 && queue.player.state.status === AudioPlayerStatus.Playing) {
        queue.player.pause();
        queue._autoPaused = true;
        autoDelete(queue.channel?.send('⏸️ Pausiert — niemand im Channel.'), DELETE_SHORT_MS);
    } else if (members > 0 && queue._autoPaused) {
        queue.player.unpause();
        queue._autoPaused = false;
        autoDelete(queue.channel?.send('▶️ Fortgesetzt — willkommen zurück!'), DELETE_SHORT_MS);
    }
});

// ── Bot starten ───────────────────────────────────────────────────
client.once('ready', () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    const api = startAPI(ctx, client);
    _apiBroadcast = api.broadcast;
    _apiGetGuildState = api.getGuildState;
});

client.login(process.env.DISCORD_TOKEN);

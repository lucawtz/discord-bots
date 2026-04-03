const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../database');

const players = new Map();
const AUTO_DISCONNECT_MS = 5 * 60 * 1000;

function getPlayer(guildId) {
  if (!players.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    player.on('error', (err) => console.error('AudioPlayer-Fehler:', err.message));
    players.set(guildId, { player, connection: null, timeout: null });
  }
  return players.get(guildId);
}

function scheduleDisconnect(guildData) {
  clearDisconnectTimeout(guildData);
  guildData.timeout = setTimeout(() => {
    if (guildData.connection && guildData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      guildData.connection.destroy();
      guildData.connection = null;
    }
  }, AUTO_DISCONNECT_MS);
}

function clearDisconnectTimeout(guildData) {
  if (guildData.timeout) {
    clearTimeout(guildData.timeout);
    guildData.timeout = null;
  }
}

async function connectToChannel(channel) {
  const guildData = getPlayer(channel.guild.id);

  if (guildData.connection) {
    const status = guildData.connection.state.status;
    if (status === VoiceConnectionStatus.Ready) {
      if (guildData.connection.joinConfig.channelId === channel.id) {
        return guildData;
      }
      guildData.connection.destroy();
      guildData.connection = null;
    } else if (status !== VoiceConnectionStatus.Destroyed) {
      guildData.connection.destroy();
      guildData.connection = null;
    }
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  connection.on('stateChange', async (oldState, newState) => {
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        try {
          connection.rejoin();
          await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
        } catch {
          if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
          }
          guildData.connection = null;
        }
      }
    }
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch {
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
    guildData.connection = null;
    throw new Error('Konnte dem Voice-Channel nicht beitreten.');
  }

  connection.subscribe(guildData.player);
  guildData.connection = connection;

  return guildData;
}

async function playSound(channel, soundId, volume = 100) {
  const audioData = db.getSoundData(soundId);
  if (!audioData) {
    throw new Error('Sound-Daten nicht gefunden.');
  }

  // Sound-Daten in temp-Datei schreiben (ffmpeg braucht einen Dateipfad)
  const sound = db.getSound(soundId);
  const ext = sound ? path.extname(sound.filename) : '.mp3';
  const tmpFile = path.join(os.tmpdir(), `eartastic_${soundId}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  fs.writeFileSync(tmpFile, audioData);

  const guildData = await connectToChannel(channel);
  clearDisconnectTimeout(guildData);

  const resource = createAudioResource(tmpFile, { inlineVolume: true });
  resource.volume.setVolume(volume / 100);
  guildData.player.play(resource);

  return new Promise((resolve) => {
    const onDone = () => {
      guildData.player.removeListener(AudioPlayerStatus.Idle, onDone);
      guildData.player.removeListener('error', onDone);
      // Temp-Datei aufraeumen
      try { fs.unlinkSync(tmpFile); } catch {}
      scheduleDisconnect(guildData);
      resolve();
    };
    guildData.player.once(AudioPlayerStatus.Idle, onDone);
    guildData.player.once('error', onDone);
  });
}

function stopSound(guildId) {
  const guildData = players.get(guildId);
  if (guildData) {
    guildData.player.stop();
    scheduleDisconnect(guildData);
  }
}

function disconnect(guildId) {
  const guildData = players.get(guildId);
  if (guildData) {
    clearDisconnectTimeout(guildData);
    if (guildData.connection && guildData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      guildData.connection.destroy();
    }
    guildData.connection = null;
  }
}

function disconnectAll() {
  for (const guildId of players.keys()) {
    disconnect(guildId);
  }
}

module.exports = { playSound, stopSound, disconnect, disconnectAll };

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const db = require('../database');
const { playSound, stopSound } = require('../utils/player');
const { t, localeFor } = require('../i18n');

const SOUNDS_PER_PAGE = 10; // Max 5 Rows x 5 Buttons = 25, aber wir brauchen Platz fuer Navigation

// Rate-Limiting: max 1 Sound pro User pro 2 Sekunden
const RATE_LIMIT_MS = 2000;
const lastPlayTimestamps = new Map();

// Rate-Limiter aufraumen (alle 10 Minuten)
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [userId, timestamp] of lastPlayTimestamps) {
    if (timestamp < cutoff) lastPlayTimestamps.delete(userId);
  }
}, 10 * 60_000);

function buildSoundboardPanel(userId, view = 'predefined', page = 0, loc = 'de') {
  let sounds;
  let title;
  let description;

  switch (view) {
    case 'predefined':
      sounds = db.getPredefinedSounds();
      title = t('sb.title.predefined', loc);
      description = t('sb.desc.predefined', loc);
      break;
    case 'all':
      sounds = db.getAllSounds();
      title = t('sb.title.all', loc);
      description = t('sb.desc.all', loc, { n: sounds.length });
      break;
    case 'favorites':
      sounds = db.getFavorites(userId);
      title = t('sb.title.favorites', loc);
      description = t('sb.desc.favorites', loc);
      break;
    default:
      sounds = db.getPredefinedSounds();
      title = t('sb.title.default', loc);
      description = '';
  }

  const totalPages = Math.max(1, Math.ceil(sounds.length / SOUNDS_PER_PAGE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const pageSounds = sounds.slice(page * SOUNDS_PER_PAGE, (page + 1) * SOUNDS_PER_PAGE);

  // Embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      sounds.length === 0
        ? t('sb.empty', loc)
        : description
    )
    .setColor(0x5865F2)
    .setFooter({ text: t('sb.footer', loc, { page: page + 1, total: totalPages, n: sounds.length }) });

  const components = [];

  // Kategorie-Auswahl (Select Menu)
  const categoryMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sb_view')
      .setPlaceholder(t('sb.categoryPlaceholder', loc))
      .addOptions([
        {
          label: t('sb.opt.predefined', loc),
          value: 'predefined',
          emoji: '🎵',
          default: view === 'predefined',
        },
        {
          label: t('sb.opt.all', loc),
          value: 'all',
          emoji: '📋',
          default: view === 'all',
        },
        {
          label: t('sb.opt.favorites', loc),
          value: 'favorites',
          emoji: '⭐',
          default: view === 'favorites',
        },
      ])
  );
  components.push(categoryMenu);

  // Sound-Buttons (max 2 Reihen a 5 Buttons = 10 Sounds pro Seite)
  if (pageSounds.length > 0) {
    let currentRow = new ActionRowBuilder();
    let buttonsInRow = 0;

    for (const sound of pageSounds) {
      if (buttonsInRow === 5) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonsInRow = 0;
      }

      const isFav = db.isFavorite(userId, sound.id);
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`sb_play_${sound.id}`)
          .setLabel(truncate(sound.name, 20))
          .setStyle(isFav ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji(sound.is_predefined ? '🔊' : '🎤')
      );
      buttonsInRow++;
    }

    if (buttonsInRow > 0) {
      components.push(currentRow);
    }
  }

  // Navigation + Aktionen
  const navRow = new ActionRowBuilder();

  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`sb_page_${view}_${page - 1}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`sb_page_${view}_${page + 1}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('sb_stop')
      .setLabel(t('sb.btn.stop', loc))
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⏹'),
    new ButtonBuilder()
      .setCustomId(`sb_refresh_${view}`)
      .setLabel(t('sb.btn.refresh', loc))
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔄'),
  );

  // Check ob wir noch Platz haben (max 5 ActionRows)
  if (components.length < 4) {
    components.push(navRow);
  } else {
    // Ersetze letzte Row mit Navigation
    components.push(navRow);
  }

  // Sicherstellen, dass wir max 5 ActionRows haben
  while (components.length > 5) {
    components.splice(components.length - 2, 1);
  }

  return { embeds: [embed], components, flags: MessageFlags.Ephemeral };
}

async function handleButton(interaction) {
  const customId = interaction.customId;
  const loc = localeFor(interaction);

  // Sound abspielen
  if (customId.startsWith('sb_play_')) {
    const soundId = parseInt(customId.replace('sb_play_', ''));
    const sound = db.getSound(soundId);

    if (!sound) {
      return interaction.reply({ content: t('sb.notFound', loc), flags: MessageFlags.Ephemeral });
    }

    // Rate-Limiting pruefen
    const userId = interaction.user.id;
    const now = Date.now();
    const lastPlay = lastPlayTimestamps.get(userId) || 0;
    if (now - lastPlay < RATE_LIMIT_MS) {
      return interaction.reply({
        content: t('sb.rateLimit', loc),
        flags: MessageFlags.Ephemeral,
      });
    }
    lastPlayTimestamps.set(userId, now);

    const member = interaction.member;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: t('sb.voiceRequired', loc),
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    try {
      const volume = db.getVolume(interaction.user.id);
      await playSound(voiceChannel, sound.id, volume);
    } catch (err) {
      console.error('Fehler beim Abspielen:', err);
      await interaction.followUp({ content: t('sb.playError', loc), flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    return;
  }

  // Navigation
  if (customId.startsWith('sb_page_')) {
    const parts = customId.replace('sb_page_', '').split('_');
    const view = parts[0];
    const page = parseInt(parts[1]);

    const panel = buildSoundboardPanel(interaction.user.id, view, page, loc);
    return interaction.update(panel);
  }

  // Stop
  if (customId === 'sb_stop') {
    stopSound(interaction.guildId);
    return interaction.reply({ content: t('sb.stopped', loc), flags: MessageFlags.Ephemeral });
  }

  // Aktualisieren — view steckt in der customId (sprachunabhaengig)
  if (customId.startsWith('sb_refresh')) {
    const view = customId.replace('sb_refresh_', '') || 'predefined';
    const panel = buildSoundboardPanel(interaction.user.id, view, 0, loc);
    return interaction.update(panel);
  }

  // Favorit togglen
  if (customId.startsWith('sb_fav_')) {
    const soundId = parseInt(customId.replace('sb_fav_', ''));
    if (db.isFavorite(interaction.user.id, soundId)) {
      db.removeFavorite(interaction.user.id, soundId);
    } else {
      db.addFavorite(interaction.user.id, soundId);
    }
    return interaction.reply({
      content: db.isFavorite(interaction.user.id, soundId)
        ? t('sb.favAdded', loc)
        : t('sb.favRemoved', loc),
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleSelectMenu(interaction) {
  if (interaction.customId === 'sb_view') {
    const view = interaction.values[0];
    const panel = buildSoundboardPanel(interaction.user.id, view, 0, localeFor(interaction));
    return interaction.update(panel);
  }
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

module.exports = {
  buildSoundboardPanel,
  handleButton,
  handleSelectMenu,
};

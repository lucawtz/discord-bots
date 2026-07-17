const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const { playSound } = require('../utils/player');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sound')
    .setDescription('Sound suchen und abspielen')
    .setDescriptionLocalizations({ 'en-US': 'Search and play a sound', 'en-GB': 'Search and play a sound' })
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Name des Sounds')
        .setDescriptionLocalizations({ 'en-US': 'Name of the sound', 'en-GB': 'Name of the sound' })
        .setRequired(true)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const results = db.searchSounds(focused);

    await interaction.respond(
      results.slice(0, 25).map(s => ({ name: s.name, value: s.name }))
    );
  },

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const loc = localeFor(interaction);
    const sound = db.getSoundByName(name);

    if (!sound) {
      return interaction.reply({ content: t('sound.notFound', loc, { name }), flags: MessageFlags.Ephemeral });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: t('sb.voiceRequired', loc), flags: MessageFlags.Ephemeral });
    }

    try {
      const volume = db.getVolume(interaction.user.id);
      await interaction.reply({ content: t('sound.playing', loc, { name: sound.name }), flags: MessageFlags.Ephemeral });
      await playSound(voiceChannel, sound.id, volume);
    } catch (err) {
      console.error('Fehler beim Abspielen:', err);
      const content = t('sb.playError', loc);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const { playSound } = require('../utils/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sound')
    .setDescription('Sound suchen und abspielen')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Name des Sounds')
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
    const sound = db.getSoundByName(name);

    if (!sound) {
      return interaction.reply({ content: `Sound **${name}** nicht gefunden.`, flags: MessageFlags.Ephemeral });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: 'Du musst in einem Voice-Channel sein!', flags: MessageFlags.Ephemeral });
    }

    try {
      const volume = db.getVolume(interaction.user.id);
      await interaction.reply({ content: `Spiele **${sound.name}** ab...`, flags: MessageFlags.Ephemeral });
      await playSound(voiceChannel, sound.id, volume);
    } catch (err) {
      console.error('Fehler beim Abspielen:', err);
      const content = 'Fehler beim Abspielen des Sounds.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

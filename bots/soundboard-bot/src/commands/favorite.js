const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Sound als Favorit markieren oder entfernen')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Name des Sounds')
        .setRequired(true)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const allSounds = [
      ...db.getPredefinedSounds(),
      ...db.getUserSounds(interaction.user.id),
    ];
    const filtered = allSounds
      .filter(s => s.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(s => ({ name: `${s.name} ${db.isFavorite(interaction.user.id, s.id) ? '⭐' : ''}`, value: s.name }))
    );
  },

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const sound = db.getSoundByName(name);

    if (!sound) {
      return interaction.reply({ content: `Sound **${name}** nicht gefunden.`, flags: MessageFlags.Ephemeral });
    }

    if (db.isFavorite(interaction.user.id, sound.id)) {
      db.removeFavorite(interaction.user.id, sound.id);
      await interaction.reply({ content: `**${name}** aus Favoriten entfernt.`, flags: MessageFlags.Ephemeral });
    } else {
      db.addFavorite(interaction.user.id, sound.id);
      await interaction.reply({ content: `**${name}** zu Favoriten hinzugefuegt! ⭐`, flags: MessageFlags.Ephemeral });
    }
  },
};

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const { t, localeFor } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Sound als Favorit markieren oder entfernen')
    .setDescriptionLocalizations({ 'en-US': 'Mark or unmark a sound as favorite', 'en-GB': 'Mark or unmark a sound as favorite' })
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Name des Sounds')
        .setDescriptionLocalizations({ 'en-US': 'Name of the sound', 'en-GB': 'Name of the sound' })
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
    const loc = localeFor(interaction);
    const sound = db.getSoundByName(name);

    if (!sound) {
      return interaction.reply({ content: t('sound.notFound', loc, { name }), flags: MessageFlags.Ephemeral });
    }

    if (db.isFavorite(interaction.user.id, sound.id)) {
      db.removeFavorite(interaction.user.id, sound.id);
      await interaction.reply({ content: t('favorite.removed', loc, { name }), flags: MessageFlags.Ephemeral });
    } else {
      db.addFavorite(interaction.user.id, sound.id);
      await interaction.reply({ content: t('favorite.added', loc, { name }), flags: MessageFlags.Ephemeral });
    }
  },
};

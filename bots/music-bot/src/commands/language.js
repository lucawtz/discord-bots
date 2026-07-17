const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Legt die Sprache des Bots auf diesem Server fest (Deutsch/Englisch)')
        .setDescriptionLocalizations({
            'en-US': 'Set the bot language for this server (German/English)',
            'en-GB': 'Set the bot language for this server (German/English)',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('sprache')
                .setNameLocalizations({ 'en-US': 'language', 'en-GB': 'language' })
                .setDescription('Deutsch oder Englisch')
                .setDescriptionLocalizations({ 'en-US': 'German or English', 'en-GB': 'German or English' })
                .setRequired(true)
                .addChoices(
                    { name: 'Deutsch', value: 'de' },
                    { name: 'English', value: 'en' },
                )),

    async execute(interaction, ctx) {
        // Basis-Name der Option ist immer 'sprache' (Locale aendert nur die Anzeige)
        const lang = interaction.options.getString('sprache');
        ctx.db.setGuildSetting(interaction.guildId, 'language', lang);
        // Bestaetigung bereits in der neu gewaehlten Sprache
        await interaction.reply({ content: t('language.set', lang), ephemeral: true });
    },
};

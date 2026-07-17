const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('DJ-Rolle festlegen oder entfernen')
        .setDescriptionLocalizations({ 'en-US': 'Set or remove the DJ role', 'en-GB': 'Set or remove the DJ role' })
        .addRoleOption(option =>
            option.setName('rolle')
                .setDescription('Die Rolle, die Songs skippen darf (leer lassen zum Entfernen)').setDescriptionLocalizations({ 'en-US': 'The role allowed to skip songs (leave empty to remove)', 'en-GB': 'The role allowed to skip songs (leave empty to remove)' })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, ctx) {
        const role = interaction.options.getRole('rolle');
        const loc = ctx.localeFor(interaction);

        if (role) {
            ctx.db.setGuildSetting(interaction.guildId, 'dj_role_id', role.id);
            ctx.autoDelete(
                interaction.reply({ content: t('setrole.set', loc, { role: role.name }), fetchReply: true }),
                ctx.DELETE_SHORT_MS
            );
        } else {
            ctx.db.setGuildSetting(interaction.guildId, 'dj_role_id', null);
            ctx.autoDelete(
                interaction.reply({ content: t('setrole.removed', loc), fetchReply: true }),
                ctx.DELETE_SHORT_MS
            );
        }
    },
};

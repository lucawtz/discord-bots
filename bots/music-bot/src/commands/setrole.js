const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('DJ-Rolle festlegen oder entfernen')
        .addRoleOption(option =>
            option.setName('rolle')
                .setDescription('Die Rolle, die Songs skippen darf (leer lassen zum Entfernen)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, ctx) {
        const role = interaction.options.getRole('rolle');

        if (role) {
            ctx.db.setGuildSetting(interaction.guildId, 'dj_role_id', role.id);
            ctx.autoDelete(
                interaction.reply({ content: `-# 🎧 DJ-Rolle auf **${role.name}** gesetzt`, fetchReply: true }),
                ctx.DELETE_SHORT_MS
            );
        } else {
            ctx.db.setGuildSetting(interaction.guildId, 'dj_role_id', null);
            ctx.autoDelete(
                interaction.reply({ content: `-# 🎧 DJ-Rolle entfernt`, fetchReply: true }),
                ctx.DELETE_SHORT_MS
            );
        }
    },
};

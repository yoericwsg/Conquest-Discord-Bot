const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'roleremove',
  description: 'Remove a role from a member',
  aliases: ['removerole', 'takerole'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('roleremove')
      .setDescription('Remove a role from a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption(o => o.setName('user').setDescription('Target member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Roles**.')], ephemeral: true });

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const role       = isSlash ? source.options.getRole('role') : source.mentions.roles.first();

    if (!targetUser || !role)
      return reply({ embeds: [error(client, 'Missing Args', 'Provide a user and a role.')], ephemeral: true });

    const member = source.guild.members.cache.get(targetUser.id);
    if (!member) return reply({ embeds: [error(client, 'Not Found', 'User not in this server.')], ephemeral: true });
    if (!member.roles.cache.has(role.id))
      return reply({ embeds: [error(client, 'Not Assigned', 'That user does not have that role.')], ephemeral: true });

    try {
      await member.roles.remove(role);
      await reply({ embeds: [success(client, 'Role Removed', `Removed ${role} from **${targetUser.username}**.`)] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

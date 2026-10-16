const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'autorole',
  description: 'Set a role given to every new member',
  aliases: ['joinrole'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('autorole')
      .setDescription('Set a role automatically given to new members')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign (leave empty to disable)'))
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Roles**.')], ephemeral: true });

    const role    = isSlash ? source.options.getRole('role') : source.mentions.roles.first();
    const configs = storage.get('configs.json', source.guild.id, {});

    if (!role) {
      delete configs.autoRole;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Auto-Role Disabled', 'New members will no longer receive an automatic role.')] });
    }

    configs.autoRole = role.id;
    storage.set('configs.json', source.guild.id, configs);
    await reply({ embeds: [success(client, 'Auto-Role Set', `${role} will be given to every new member.`)] });
  },
};

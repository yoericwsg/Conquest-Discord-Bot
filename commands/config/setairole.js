const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'setairole',
  description: 'Set which role can use AI creation features',
  aliases: ['airole'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setairole')
      .setDescription('Set which role can trigger AI server actions (create channels, roles, etc.)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption(o => o.setName('role').setDescription('Role to allow AI actions (leave empty to remove restriction)').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'Need **Manage Server** to configure AI roles.')] });

    const guildId = source.guild.id;
    const configs = storage.get('configs.json', guildId, {});

    // slash: role option or nothing | prefix: mention or "none"
    let role = null;
    if (isSlash) {
      role = source.options.getRole('role');
    } else {
      if (args[0]?.toLowerCase() === 'none' || args[0]?.toLowerCase() === 'remove') {
        role = null;
      } else {
        role = source.mentions.roles.first() ?? null;
      }
    }

    if (!role && !isSlash && args.length && !['none','remove'].includes(args[0]?.toLowerCase())) {
      return reply({ embeds: [error(client, 'No Role', 'Mention a role or type `none` to remove the restriction.')] });
    }

    if (role) {
      configs.aiActionRole = role.id;
      storage.set('configs.json', guildId, configs);
      return reply({ embeds: [success(client, '🤖 AI Role Set', `Only members with ${role} (or admins) can use AI creation features.\nThis covers: create/delete channels, roles, categories, assign roles, set permissions.`)] });
    } else {
      delete configs.aiActionRole;
      storage.set('configs.json', guildId, configs);
      return reply({ embeds: [info(client, '🤖 AI Role Removed', [], 'AI creation features are now open to everyone in AI-enabled channels.')] });
    }
  },
};

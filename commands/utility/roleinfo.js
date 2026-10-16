const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel, error } = require('../../utils/embed');

module.exports = {
  name: 'roleinfo',
  description: 'Show info about a role',
  aliases: ['rinfo', 'ri'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('roleinfo')
      .setDescription('Get information about a role')
      .addRoleOption(o => o.setName('role').setDescription('Role to inspect').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const role    = isSlash ? source.options.getRole('role') : source.mentions.roles.first();
    if (!role) return reply({ embeds: [error(client, 'No Role', 'Mention a role.')], ephemeral: true });

    const created   = Math.floor(role.createdTimestamp / 1000);
    const perms     = role.permissions.toArray();
    const keyPerms  = ['ADMINISTRATOR','MANAGE_GUILD','MANAGE_CHANNELS','BAN_MEMBERS','KICK_MEMBERS','MANAGE_ROLES','MANAGE_MESSAGES'];
    const displayed = perms.filter(p => keyPerms.includes(p)).map(p => `\`${p}\``).join(', ') || 'None notable';

    const embed = panel(client, `🏷️  Role: ${role.name}`, [
      `**ID:**        \`${role.id}\``,
      `**Color:**     \`${role.hexColor}\``,
      `**Members:**   \`${role.members.size}\``,
      `**Position:**  \`${role.position}\``,
      `**Created:**   <t:${created}:R>`,
      `**Hoisted:**   ${role.hoist ? 'Yes' : 'No'}`,
      `**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
      `**Key Permissions:** ${displayed}`,
    ], role.hexColor !== '#000000' ? role.hexColor : null);

    await reply({ embeds: [embed] });
  },
};

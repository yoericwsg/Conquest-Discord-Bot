const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const earlyAccess = require('../../systems/early-access');
const { TEMPLATES } = require('../../systems/server-builder');

module.exports = {
  name: 'rolesetup',
  description: 'Add the full unitClan staff and clan role set',
  aliases: ['setuprroles', 'clanroles'],
  cooldown: 20,
  slash: { data: new SlashCommandBuilder().setName('rolesetup').setDescription('Add the early-access staff and clan role set').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) },
  async execute(source) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply({ ...payload, flags: MessageFlags.Ephemeral }) : source.channel.send(payload);
    if (!source.guild) return reply({ content: 'Run this command inside the server.', ephemeral: true });
    if (!earlyAccess.isEarlyAccessGuild(source.guild.id)) return reply({ content: 'This server is not enrolled in v4.6.2 early access. The team must select it with `?earlyaccess <serverID>` first.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageRoles)) return reply({ content: 'You need **Manage Roles** permission.', ephemeral: true });
    const specs = [...TEMPLATES.server.roles, ...TEMPLATES.clan.roles].filter((role, index, all) => all.findIndex(item => item.name.toLowerCase() === role.name.toLowerCase()) === index);
    const me = source.guild.members.me ?? await source.guild.members.fetchMe().catch(() => null);
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return reply({ content: 'I need **Manage Roles** permission first.', ephemeral: true });
    const created = [], skipped = [], failed = [];
    for (const spec of specs) {
      if (source.guild.roles.cache.some(role => role.name.toLowerCase() === spec.name.toLowerCase())) { skipped.push(spec.name); continue; }
      try { const role = await source.guild.roles.create({ name: spec.name, color: spec.color, hoist: Boolean(spec.hoist), reason: 'unitClan v4.6.2 early-access rolesetup' }); created.push(`<@&${role.id}>`); }
      catch (error) { failed.push(`${spec.name}: ${error.message}`); }
    }
    return reply({ embeds: [new EmbedBuilder().setColor(failed.length ? '#FEE75C' : '#57F287').setTitle('Early-access roles ready').setDescription(`Created **${created.length}** role(s); skipped **${skipped.length}** existing role(s).\n\n${created.length ? `**Created:** ${created.join(', ')}` : '**Created:** nothing new'}${failed.length ? `\n\n**Failed:** ${failed.slice(0, 8).join('; ')}` : ''}`)] });
  },
};


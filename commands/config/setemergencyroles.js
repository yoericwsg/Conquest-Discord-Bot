const { PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { success, error, info } = require('../../utils/embed');
const {
  getEmergencyRoleIds,
  setEmergencyRoleIds,
  validateEmergencyRole,
} = require('../../systems/emergency-roles');

function listText(guild, roleIds) {
  const roles = roleIds
    .map(id => guild.roles.cache.get(id))
    .filter(Boolean);
  return roles.length
    ? roles.map(role => `${role} (\`${role.id}\`)`).join('\n')
    : '*No emergency roles approved.*';
}

module.exports = {
  name: 'setemergencyroles',
  description: 'Manage this server’s allowlist for owner-only emergency role grants',
  cooldown: 10,
  async execute(source, args, client) {
    if (!source.guild) {
      return source.channel.send('Run this command in the server where you want to configure emergency roles.');
    }
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return source.channel.send({
        embeds: [error(client, 'No Permission', 'You need **Manage Server** to approve emergency roles.')],
      });
    }

    const guild = source.guild;
    const action = String(args[0] ?? 'list').toLowerCase();
    const current = getEmergencyRoleIds(guild.id);

    if (action === 'list') {
      return source.channel.send({
        embeds: [info(
          client,
          'Approved emergency roles',
          [],
          `${listText(guild, current)}\n\nUse \`?setemergencyroles add @role\`, \`remove @role\`, or \`clear\`.`,
        )],
      });
    }

    if (action === 'clear') {
      setEmergencyRoleIds(guild.id, []);
      return source.channel.send({
        embeds: [success(client, 'Emergency roles cleared', 'No roles can be added through the owner-only emergency DM flow.')],
      });
    }

    if (!['add', 'remove'].includes(action)) {
      return source.channel.send({
        embeds: [info(client, 'Emergency role setup', [], '`?setemergencyroles add @role`\n`?setemergencyroles remove @role`\n`?setemergencyroles list`\n`?setemergencyroles clear`')],
      });
    }

    const roles = [...source.mentions.roles.values()];
    if (!roles.length) {
      return source.channel.send({
        embeds: [error(client, 'Mention a role', `Use \`?setemergencyroles ${action} @role\`.`)],
      });
    }
    if (roles.some(role => role.guild.id !== guild.id)) {
      return source.channel.send({
        embeds: [error(client, 'Invalid role', 'Choose roles from this server only.')],
      });
    }

    if (action === 'add') {
      const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
      const invalid = roles
        .map(role => ({ role, problem: validateEmergencyRole(role, guild.id, botMember) }))
        .find(entry => entry.problem);
      if (invalid) {
        return source.channel.send({
          embeds: [error(client, 'Role not eligible', `${invalid.role} cannot be approved: ${invalid.problem}`)],
        });
      }
      const ids = [...new Set([...current, ...roles.map(role => role.id)])];
      if (ids.length > 20) {
        return source.channel.send({
          embeds: [error(client, 'Allowlist limit reached', 'A server can approve at most 20 emergency roles.')],
        });
      }
      setEmergencyRoleIds(guild.id, ids);
      return source.channel.send({
        embeds: [success(client, 'Emergency role approved', `${roles.map(role => `${role}`).join(', ')} can now be requested by the verified unitClan application owner in DMs.`)],
      });
    }

    const removeIds = new Set(roles.map(role => role.id));
    const remaining = current.filter(id => !removeIds.has(id));
    setEmergencyRoleIds(guild.id, remaining);
    return source.channel.send({
      embeds: [info(client, 'Emergency role removed', [], `${roles.map(role => `${role}`).join(', ')} ${roles.length === 1 ? 'is' : 'are'} no longer on the emergency allowlist.`)],
    });
  },
};

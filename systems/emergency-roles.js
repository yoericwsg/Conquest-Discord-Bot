const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');

const ROLE_ALLOWLIST_FILE = 'emergencyroles.json';
const ROLE_AUDIT_FILE = 'emergencyroleaudit.json';
const MAX_AUDIT_ENTRIES = 100;
const BLOCKED_ROLE_PERMISSIONS =
  PermissionFlagsBits.Administrator |
  PermissionFlagsBits.ManageGuild |
  PermissionFlagsBits.ManageRoles;

function getEmergencyRoleIds(guildId) {
  const ids = storage.get(ROLE_ALLOWLIST_FILE, guildId, []);
  return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : [];
}

function setEmergencyRoleIds(guildId, roleIds) {
  const ids = [...new Set(roleIds.filter(id => typeof id === 'string'))];
  storage.set(ROLE_ALLOWLIST_FILE, guildId, ids);
  return ids;
}

function validateEmergencyRole(role, guildId, botMember) {
  if (!role) return 'That role no longer exists.';
  if (role.id === guildId) return 'The @everyone role cannot be granted.';
  if (role.managed) return 'Integration-managed roles cannot be granted.';

  const permissions = BigInt(role.permissions?.bitfield ?? 0n);
  if ((permissions & BLOCKED_ROLE_PERMISSIONS) !== 0n) {
    return 'Roles with Administrator, Manage Server, or Manage Roles are not eligible.';
  }
  if (!botMember?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
    return 'unitClan needs Manage Roles in that server.';
  }

  const botHighestPosition = botMember.roles?.highest?.position;
  if (typeof botHighestPosition !== 'number' || role.position >= botHighestPosition) {
    return 'The role must be below unitClan’s highest role.';
  }

  return null;
}

function findEmergencyRole(guild, roleQuery, allowlistedIds) {
  const query = String(roleQuery ?? '').trim().replace(/^<@&(\d+)>$/, '$1');
  if (!query) return { role: null, error: 'Give a role name or role ID.' };

  const allowedRoles = allowlistedIds
    .map(id => guild.roles.cache.get(id))
    .filter(Boolean);

  const byId = allowedRoles.find(role => role.id === query);
  if (byId) return { role: byId, error: null };

  const byName = allowedRoles.filter(role => role.name.toLowerCase() === query.toLowerCase());
  if (byName.length === 1) return { role: byName[0], error: null };
  if (byName.length > 1) {
    return { role: null, error: 'More than one approved role has that name; use its role ID.' };
  }
  return { role: null, error: 'That role is not on this server’s emergency allowlist.' };
}

async function auditEmergencyRoleGrant(guild, client, member, role) {
  const entry = {
    action: 'role_granted',
    guildId: guild.id,
    userId: member.id,
    roleId: role.id,
    roleName: role.name,
    at: new Date().toISOString(),
  };

  let persisted = false;
  try {
    storage.update(ROLE_AUDIT_FILE, guild.id, entries => {
      const safeEntries = Array.isArray(entries) ? entries : [];
      return [...safeEntries, entry].slice(-MAX_AUDIT_ENTRIES);
    }, []);
    persisted = true;
  } catch (error) {
    console.error('[EMERGENCY ROLE AUDIT]', error.message);
  }

  let channelLogged = false;
  try {
    const config = storage.get('configs.json', guild.id, {});
    const channel = config.logChannel
      ? guild.channels.cache.get(config.logChannel) ??
        await guild.channels.fetch(config.logChannel).catch(() => null)
      : null;
    if (channel?.isTextBased?.() && typeof channel.send === 'function') {
      const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('Emergency Role Granted')
        .setDescription(
          `**Member:** ${member} (\`${member.id}\`)\n` +
          `**Role:** ${role.name} (\`${role.id}\`)\n` +
          '**Requested by:** verified unitClan application owner via DM',
        )
        .setTimestamp();
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      channelLogged = true;
    }
  } catch (error) {
    console.error('[EMERGENCY ROLE LOG]', error.message);
  }

  return { persisted, channelLogged };
}

module.exports = {
  ROLE_ALLOWLIST_FILE,
  ROLE_AUDIT_FILE,
  BLOCKED_ROLE_PERMISSIONS,
  getEmergencyRoleIds,
  setEmergencyRoleIds,
  validateEmergencyRole,
  findEmergencyRole,
  auditEmergencyRoleGrant,
};

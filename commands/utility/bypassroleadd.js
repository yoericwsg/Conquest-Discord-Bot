const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { base, error, info } = require('../../utils/embed');
const {
  getEmergencyRoleIds,
  findEmergencyRole,
  validateEmergencyRole,
  auditEmergencyRoleGrant,
} = require('../../systems/emergency-roles');
const { isApplicationOwner } = require('../../systems/owner-access');

const MAX_GRANTS_PER_REQUEST = 10;
const CONFIRMATION_TIMEOUT = 60_000;

function escapeMarkdown(value) {
  return String(value ?? 'Unknown').replace(/([\\`*_~|])/g, '\\$1').slice(0, 200);
}

function commandHelp(client, guilds) {
  const lines = [
    'This DM-only command can grant only roles that each server has explicitly approved.',
    '',
    '**Examples**',
    '`?bypassroleadd <server ID> <role name or ID>`',
    '`?bypassroleadd all <role name>`',
    '',
    '**Configured servers and roles**',
  ];

  let count = 0;
  for (const guild of guilds) {
    const ids = getEmergencyRoleIds(guild.id);
    const labels = ids
      .map(id => guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => `${escapeMarkdown(role.name)} (\`${role.id}\`)`);
    if (!labels.length) continue;
    lines.push(`**${escapeMarkdown(guild.name)}** · \`${guild.id}\`\n${labels.join(', ')}`);
    count += labels.length;
    if (count >= 20) {
      lines.push('*More roles may be configured; use the server ID and role name directly.*');
      break;
    }
  }
  if (!count) lines.push('*No servers have approved emergency roles yet.*');
  lines.push('', 'You must already be a member of the target server. Discord role hierarchy still applies.');

  return base(client)
    .setTitle('Emergency role request')
    .setDescription(lines.join('\n').slice(0, 4000));
}

async function prepareGrant(client, guild, ownerId, roleQuery) {
  await guild.roles.fetch().catch(() => null);
  const allowedIds = getEmergencyRoleIds(guild.id);
  const match = findEmergencyRole(guild, roleQuery, allowedIds);
  if (!match.role) return { error: match.error };

  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
  const invalidRole = validateEmergencyRole(match.role, guild.id, botMember);
  if (invalidRole) return { error: invalidRole };

  const member = await guild.members.fetch(ownerId).catch(() => null);
  if (!member) return { error: 'You must be a member of that server.' };
  if (!allowedIds.includes(match.role.id)) {
    return { error: 'That role is no longer on the server’s emergency allowlist.' };
  }
  if (member.roles.cache.has(match.role.id)) {
    return { alreadyHasRole: true, role: match.role };
  }

  return {
    candidate: { guild, roleId: match.role.id, roleName: match.role.name },
    role: match.role,
    member,
  };
}

async function findScope(client, ownerId, serverSelector, roleQuery) {
  if (serverSelector.toLowerCase() === 'all') {
    const candidates = [];
    let skipped = 0;
    for (const guild of client.guilds.cache.values()) {
      const result = await prepareGrant(client, guild, ownerId, roleQuery);
      if (result.candidate) candidates.push(result);
      else skipped++;
    }
    return { candidates, skipped, error: null };
  }

  const guild = client.guilds.cache.get(serverSelector);
  if (!guild) {
    return { candidates: [], skipped: 0, error: 'Use a server ID shown by `?bypassroleadd`, or use `all`.' };
  }
  const result = await prepareGrant(client, guild, ownerId, roleQuery);
  if (!result.candidate) {
    return { candidates: [], skipped: 0, error: result.error ?? 'You already have that role.' };
  }
  return { candidates: [result], skipped: 0, error: null };
}

function confirmationPayload(client, candidates, skipped) {
  const lines = candidates.map(item =>
    `• **${escapeMarkdown(item.candidate.guild.name)}** — ${escapeMarkdown(item.candidate.roleName)}`);
  const embed = base(client)
    .setColor('#FEE75C')
    .setTitle('Confirm emergency role grant')
    .setDescription(
      `This will add the following allowlisted role${candidates.length === 1 ? '' : 's'} to your account:\n\n` +
      `${lines.join('\n')}\n\n` +
      (skipped ? `Skipped ${skipped} other server${skipped === 1 ? '' : 's'} where you are not eligible.\n\n` : '') +
      'This action is recorded and sent to each server’s configured log channel when available.',
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('bypassroleadd:confirm')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('bypassroleadd:cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
}

module.exports = {
  name: 'bypassroleadd',
  description: 'Request an allowlisted emergency role for yourself via DM',
  cooldown: 30,
  async execute(source, args, client) {
    const userId = source.author.id;
    if (!await isApplicationOwner(client, userId)) {
      return source.reply('This command is restricted to the verified unitClan application owner.');
    }
    if (source.guild) {
      return source.reply('For privacy, use `?bypassroleadd` in DMs.');
    }

    const guilds = [...client.guilds.cache.values()];
    const serverSelector = String(args[0] ?? '').trim();
    const roleQuery = args.slice(1).join(' ').trim();
    if (!serverSelector || !roleQuery) {
      return source.channel.send({ embeds: [commandHelp(client, guilds)] });
    }
    if (serverSelector.toLowerCase() !== 'all' && !/^\d{15,22}$/.test(serverSelector)) {
      return source.channel.send({
        embeds: [error(client, 'Use a server ID', 'Copy the server ID from the list shown by `?bypassroleadd`, then provide the role name or ID.')],
      });
    }

    const { candidates, skipped, error: scopeError } = await findScope(client, userId, serverSelector, roleQuery);
    if (scopeError) {
      return source.channel.send({ embeds: [error(client, 'Role request not available', scopeError)] });
    }
    if (!candidates.length) {
      return source.channel.send({
        embeds: [info(client, 'No eligible roles found', [], `No server has an approved \`${roleQuery}\` role that can be added to your account.`)],
      });
    }
    if (candidates.length > MAX_GRANTS_PER_REQUEST) {
      return source.channel.send({
        embeds: [error(client, 'Too many roles at once', `This request would grant ${candidates.length} roles. Run it for one server at a time; the limit is ${MAX_GRANTS_PER_REQUEST}.`)],
      });
    }

    const prompt = await source.channel.send(confirmationPayload(client, candidates, skipped));
    let decision;
    try {
      decision = await prompt.awaitMessageComponent({
        time: CONFIRMATION_TIMEOUT,
        filter: interaction => interaction.user.id === userId &&
          ['bypassroleadd:confirm', 'bypassroleadd:cancel'].includes(interaction.customId),
      });
    } catch {
      await prompt.edit({
        embeds: [info(client, 'Request expired', [], 'No roles were changed. Run the command again when you are ready.')],
        components: [],
      }).catch(() => null);
      return prompt;
    }

    if (decision.customId === 'bypassroleadd:cancel') {
      await decision.update({
        embeds: [info(client, 'Request cancelled', [], 'No roles were changed.')],
        components: [],
      });
      return prompt;
    }

    await decision.deferUpdate();
    const results = [];
    for (const planned of candidates) {
      const guild = client.guilds.cache.get(planned.candidate.guild.id);
      if (!guild) {
        results.push(`• **${escapeMarkdown(planned.candidate.guild.name)}:** server unavailable`);
        continue;
      }
      const finalCheck = await prepareGrant(client, guild, userId, planned.candidate.roleId);
      if (!finalCheck.candidate) {
        results.push(`• **${escapeMarkdown(guild.name)}:** not granted (${finalCheck.error ?? 'already has role'})`);
        continue;
      }

      const { role, member } = finalCheck;
      if (!role || !member) {
        results.push(`• **${escapeMarkdown(guild.name)}:** not granted (member or role unavailable)`);
        continue;
      }

      try {
        await member.roles.add(role, 'Confirmed owner-only emergency role request');
        const audit = await auditEmergencyRoleGrant(guild, client, member, role);
        if (audit.persisted || audit.channelLogged) {
          results.push(`• **${escapeMarkdown(guild.name)}:** granted **${escapeMarkdown(role.name)}**`);
          continue;
        }

        const reverted = await member.roles
          .remove(role, 'Emergency role grant rolled back because audit logging failed')
          .then(() => true)
          .catch(() => false);
        results.push(reverted
          ? `• **${escapeMarkdown(guild.name)}:** not granted (audit logging unavailable)`
          : `• **${escapeMarkdown(guild.name)}:** grant succeeded, but audit logging and rollback both failed`);
      } catch (grantError) {
        console.error(`[EMERGENCY ROLE GRANT] ${guild.id}:`, grantError.message);
        results.push(`• **${escapeMarkdown(guild.name)}:** Discord rejected the role grant`);
      }
    }

    await prompt.edit({
      embeds: [base(client)
        .setTitle('Emergency role request complete')
        .setDescription(results.join('\n').slice(0, 4000))],
      components: [],
    }).catch(() => null);
    return prompt;
  },
};

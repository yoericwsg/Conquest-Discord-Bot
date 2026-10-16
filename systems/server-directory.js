const INVITE_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([A-Za-z0-9-]+)(?:[/?#].*)?$/i;

function parseDiscordInvite(input) {
  const match = String(input ?? '').trim().match(INVITE_PATTERN);
  return match ? match[1] : null;
}

async function validateGuildInvite(client, guildId, input) {
  const code = parseDiscordInvite(input);
  if (!code) {
    throw new Error('Use a valid Discord invite URL, such as `https://discord.gg/example`.');
  }

  let invite;
  try {
    invite = await client.fetchInvite(code);
  } catch {
    throw new Error('That invite is invalid or expired.');
  }

  if (invite.guild?.id !== guildId) {
    throw new Error('That invite does not belong to this server.');
  }
  return `https://discord.gg/${invite.code ?? code}`;
}

function buildDirectoryEntries(guilds, getGuildConfig) {
  return [...guilds]
    .map(guild => {
      const config = getGuildConfig(guild.id) ?? {};
      const code = parseDiscordInvite(config.serverInvite);
      return {
        id: guild.id,
        name: guild.name,
        memberCount: Number.isFinite(guild.memberCount) ? guild.memberCount : null,
        invite: code ? `https://discord.gg/${code}` : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { parseDiscordInvite, validateGuildInvite, buildDirectoryEntries };

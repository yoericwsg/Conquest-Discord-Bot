const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const { base } = require('../../utils/embed');

async function chooseInviteChannel(guild, client) {
  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
  if (!botMember) return null;
  const channels = [guild.systemChannel, ...guild.channels.cache.values()].filter(Boolean);
  const seen = new Set();
  for (const channel of channels) {
    if (seen.has(channel.id)) continue;
    seen.add(channel.id);
    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) continue;
    const permissions = channel.permissionsFor(botMember);
    if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.CreateInstantInvite)) continue;
    return channel;
  }
  return null;
}

module.exports = {
  name: 'forcegeninvite',
  description: 'Generate fresh invite links for servers Conquest is in (owner/team DMs)',
  cooldown: 30,
  async execute(source, args, client) {
    if (source.guild) return source.reply('Run this command in Conquest’s DMs.');
    if (!await isApplicationOwner(client, source.author.id))
      return source.reply('This command is restricted to the verified Conquest owner/team.');

    const requestedId = String(args[0] ?? '').trim();
    const guilds = requestedId
      ? [client.guilds.cache.get(requestedId)].filter(Boolean)
      : [...client.guilds.cache.values()];
    if (!guilds.length) return source.reply('No matching server. Use `?checkservers` to list current servers.');

    await source.channel.send(`Generating fresh 7-day invites for ${guilds.length} server(s). This can take a moment.`);
    const results = [];
    for (const guild of guilds) {
      const channel = await chooseInviteChannel(guild, client);
      if (!channel) {
        results.push({ guild, invite: null, detail: 'No channel with Create Invite permission' });
        continue;
      }
      try {
        const invite = await channel.createInvite({
          maxAge: 604_800, maxUses: 0, unique: true,
          reason: `Fresh Conquest directory invite requested by team member ${source.author.tag}`,
        });
        results.push({ guild, invite: `https://discord.gg/${invite.code}`, detail: `${channel.name} · expires in 7 days` });
      } catch (error) {
        results.push({ guild, invite: null, detail: error.message.slice(0, 180) });
      }
    }

    const successes = results.filter(result => result.invite).length;
    await source.channel.send(`Finished: ${successes}/${results.length} invites generated. These links were sent privately and do not replace server-admin-approved directory links.`);
    for (let i = 0; i < results.length; i += 10) {
      const embed = base(client).setTitle('Fresh server invites').setDescription('Private owner/team output · generated links expire after 7 days.');
      for (const result of results.slice(i, i + 10)) {
        embed.addFields({
          name: `${result.guild.name} · ${result.guild.id}`.slice(0, 256),
          value: result.invite ? `[Join](${result.invite}) · ${result.detail}` : `Not generated: ${result.detail}`,
          inline: false,
        });
      }
      embed.setFooter({ text: `Page ${Math.floor(i / 10) + 1}/${Math.max(1, Math.ceil(results.length / 10))}` });
      await source.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    }
  },
};

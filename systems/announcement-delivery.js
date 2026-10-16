const { PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');

async function resolveAnnouncementChannel(guild, client) {
  const configs = storage.get('configs.json', guild.id, {});
  let channel = configs.announcementChannel
    ? guild.channels.cache.get(configs.announcementChannel) ??
      await guild.channels.fetch(configs.announcementChannel).catch(() => null)
    : null;
  if (!channel) channel = guild.systemChannel;
  if (!channel?.isTextBased?.() || typeof channel.send !== 'function') return null;

  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
  const permissions = botMember ? channel.permissionsFor(botMember) : null;
  if (!permissions?.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)) return null;
  return channel;
}

async function broadcastEmbed(client, embed, content, targetGuilds = client.guilds.cache.values()) {
  const results = [];
  for (const guild of targetGuilds) {
    const channel = await resolveAnnouncementChannel(guild, client).catch(() => null);
    if (!channel) {
      results.push({ guildId: guild.id, guildName: guild.name, sent: false });
      continue;
    }
    try {
      await channel.send({ content: content || undefined, embeds: [embed], allowedMentions: { parse: [] } });
      results.push({ guildId: guild.id, guildName: guild.name, channelId: channel.id, sent: true });
    } catch (error) {
      console.error(`[ANNOUNCEMENT] ${guild.id}: ${error.message}`);
      results.push({ guildId: guild.id, guildName: guild.name, sent: false });
    }
  }
  return results;
}

module.exports = { resolveAnnouncementChannel, broadcastEmbed };

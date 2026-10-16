const { EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const cfg = require('../config.json');
const { SEP, FOOTER } = require('../utils/embed');

function getLogChannel(guild, client) {
  const configs = storage.get('configs.json', guild.id, {});
  if (!configs.logChannel) return null;
  return guild.channels.cache.get(configs.logChannel) ?? null;
}

async function send(guild, client, embed) {
  const ch = getLogChannel(guild, client);
  if (ch) await ch.send({ embeds: [embed] }).catch(() => null);
}

function base(color) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

async function onMessageDelete(msg, client) {
  if (!msg.guild || msg.author?.bot) return;
  const embed = base('#ED4245')
    .setTitle('🗑️  Message Deleted')
    .setDescription(`${SEP}\n**Author:** ${msg.author?.tag ?? 'Unknown'}\n**Channel:** ${msg.channel}\n**Content:**\n${msg.content?.substring(0, 900) || '*empty*'}\n${SEP}`);
  await send(msg.guild, client, embed);
}

async function onMessageEdit(oldMsg, newMsg, client) {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;
  const embed = base('#FEE75C')
    .setTitle('✏️  Message Edited')
    .setDescription(`${SEP}\n**Author:** ${newMsg.author.tag}\n**Channel:** ${newMsg.channel}\n[Jump to Message](${newMsg.url})\n${SEP}`)
    .addFields(
      { name: 'Before', value: oldMsg.content?.substring(0, 400) || '*empty*' },
      { name: 'After',  value: newMsg.content?.substring(0, 400) || '*empty*' }
    );
  await send(newMsg.guild, client, embed);
}

async function onJoin(member, client) {
  const embed = base('#57F287')
    .setTitle('📥  Member Joined')
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription(`${SEP}\n**User:** ${member.user.tag} (${member.id})\n**Account Age:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Members:** ${member.guild.memberCount}\n${SEP}`);
  await send(member.guild, client, embed);
}

async function onLeave(member, client) {
  const embed = base('#ED4245')
    .setTitle('📤  Member Left')
    .setThumbnail(member.user?.displayAvatarURL({ size: 256 }) ?? null)
    .setDescription(`${SEP}\n**User:** ${member.user?.tag ?? 'Unknown'} (${member.id})\n**Joined:** ${member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown'}\n**Members:** ${member.guild.memberCount}\n${SEP}`);
  await send(member.guild, client, embed);
}

async function modLog(guild, client, action, target, moderator, reason, color = '#FF7300') {
  const embed = base(color)
    .setTitle(`🔨  ${action}`)
    .setDescription(`${SEP}\n**User:** ${target}\n**Moderator:** ${moderator}\n**Reason:** ${reason}\n${SEP}`);
  await send(guild, client, embed);
}

module.exports = { onMessageDelete, onMessageEdit, onJoin, onLeave, modLog };

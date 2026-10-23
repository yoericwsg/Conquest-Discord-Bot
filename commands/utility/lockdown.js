const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');
const { MODES } = require('./lockdownmode');

const pending = new Map();
const LOCKDOWNS_FILE = 'lockdowns.json';
const LOCKED_PERMISSIONS = ['SendMessages', 'SendMessagesInThreads'];

function currentOverwrite(channel, targetId, permission) {
  const overwrite = channel.permissionOverwrites.cache.get(targetId);
  if (!overwrite) return null;
  if (overwrite.allow.has(PermissionFlagsBits[permission])) return true;
  if (overwrite.deny.has(PermissionFlagsBits[permission])) return false;
  return null;
}

module.exports = {
  name: 'lockdown',
  description: 'Temporarily block member messages while preserving server channels',
  cooldown: 10,
  slash: { data: new SlashCommandBuilder()
    .setName('lockdown').setDescription('Temporarily block member messages; channels are preserved')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('start').setDescription('Start a reversible lockdown (requires confirmation)')
      .addStringOption(option => option.setName('reason').setDescription('Why the server is being locked down').setMaxLength(900)))
    .addSubcommand(sub => sub.setName('confirm').setDescription('Confirm the reversible message lockdown')) },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild = source.guild;
    const actor = source.user ?? source.author;
    const member = source.member;
    const reply = payload => isSlash ? source.reply({ ...payload, ephemeral: true }) : source.reply(payload);
    if (!guild) return reply({ content: 'Run this command inside the server you intend to lock down.' });
    if (!member?.permissions?.has(PermissionFlagsBits.Administrator))
      return reply({ content: 'You need **Administrator** permission to start a server lockdown.' });
    const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels))
      return reply({ content: 'I need **Manage Channels** permission to perform the lockdown.' });

    const key = `${guild.id}:${actor.id}`;
    if (!isSlash && String(args[0] ?? '').toLowerCase() === 'cancel') {
      return require('./cancellockdown').execute(source, args.slice(1), client);
    }
    const confirm = isSlash ? source.options.getSubcommand() === 'confirm' : String(args[0] ?? '').toLowerCase() === 'confirm';
    if (!confirm) {
      const config = storage.get('configs.json', guild.id, {});
      const mode = MODES[config.lockdownMode] ? config.lockdownMode : 'shutdown';
      const reason = (isSlash ? source.options.getString('reason') : args.join(' '))?.trim() || MODES[mode];
      pending.set(key, { mode, reason: reason.slice(0, 900), expiresAt: Date.now() + 60_000 });
      return reply({ content: `⚠️ This temporarily blocks members from sending messages in existing text channels. **No channels or messages are deleted.**\nMode: **${mode}**\nReason: ${reason}\nTo continue within 60 seconds, run **?lockdown confirm** or **/lockdown confirm** in this server.` });
    }

    const request = pending.get(key);
    pending.delete(key);
    if (!request || request.expiresAt < Date.now())
      return reply({ content: 'No active confirmation. Run `?lockdown [reason]` or `/lockdown start` first.' });

    const everyone = guild.roles.everyone;
    await guild.channels.fetch().catch(() => null);
    const channels = [...guild.channels.cache.values()].filter(channel =>
      channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement ||
      channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildMedia);
    const snapshot = channels.map(channel => {
      const targetIds = new Set([everyone.id, ...channel.permissionOverwrites.cache.keys()]);
      return {
        channelId: channel.id,
        overwrites: [...targetIds]
          .filter(targetId => targetId !== client.user.id)
          .map(targetId => ({
            targetId,
            permissions: Object.fromEntries(LOCKED_PERMISSIONS.map(permission => [permission, currentOverwrite(channel, targetId, permission)])),
          })),
      };
    });
    const records = storage.read(LOCKDOWNS_FILE, {});
    records[guild.id] = {
      active: true, mode: request.mode, reason: request.reason, startedAt: Date.now(),
      startedById: actor.id, channelOverwrites: snapshot,
      noticeChannelId: null, noticeMessageId: null,
    };
    storage.write(LOCKDOWNS_FILE, records);

    const failures = [];
    for (const saved of snapshot) {
      const channel = channels.find(entry => entry.id === saved.channelId);
      for (const overwrite of saved.overwrites) {
        try {
          await channel.permissionOverwrites.edit(overwrite.targetId, {
            SendMessages: false,
            SendMessagesInThreads: false,
          }, { reason: `Reversible unitClan lockdown by ${actor.tag ?? actor.username}` });
        } catch (error) {
          failures.push(`${channel.name}: ${error.message}`);
          break;
        }
      }
    }

    try {
      const notice = await guild.channels.create({
        name: 'lockedown', type: ChannelType.GuildText,
        reason: `Lockdown notice created by ${actor.tag ?? actor.username}`,
        permissionOverwrites: [
          { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
        ],
      });
      const embed = new EmbedBuilder().setColor(0xED4245)
        .setTitle('🔒  SERVER LOCKDOWN')
        .setDescription(`**${MODES[request.mode] ?? 'This server is temporarily locked down.'}**\n\n**Reason**\n${request.reason}`)
        .addFields(
          { name: 'Mode', value: request.mode, inline: true },
          { name: 'Started by', value: `<@${actor.id}>`, inline: true },
          { name: 'Recovery', value: 'An Administrator can run `?cancellockdown` or `/cancellockdown` to restore the previous channel permissions.' },
        ).setTimestamp().setFooter({ text: `${guild.name} · Existing channels and messages are preserved` });
      const posted = await notice.send({ embeds: [embed], allowedMentions: { parse: [] } });
      records[guild.id] = { ...records[guild.id], noticeChannelId: notice.id, noticeMessageId: posted.id };
      storage.write(LOCKDOWNS_FILE, records);
      if (failures.length) await notice.send({ content: `⚠️ Could not lock ${failures.length} text channel(s); check my role position and Manage Channels permission.`, allowedMentions: { parse: [] } });
      await actor.send(`Lockdown is active in **${guild.name}**. Existing channels and messages were preserved. Use ?cancellockdown in the server to restore saved permissions.${failures.length ? ` ${failures.length} channel(s) could not be locked.` : ''}`).catch(() => null);
      return null;
    } catch (error) {
      console.error(`[LOCKDOWN] ${guild.id}: ${error.stack || error}`);
      let restoreFailed = false;
      for (const saved of snapshot) {
        const channel = guild.channels.cache.get(saved.channelId);
        if (!channel?.permissionOverwrites?.edit) { restoreFailed = true; continue; }
        for (const overwrite of saved.overwrites) {
          try {
            await channel.permissionOverwrites.edit(overwrite.targetId, overwrite.permissions, {
              reason: 'Automatic rollback after lockdown notice creation failed',
            });
          } catch { restoreFailed = true; }
        }
      }
      records[guild.id] = { ...records[guild.id], active: restoreFailed, rollbackAt: Date.now() };
      storage.write(LOCKDOWNS_FILE, records);
      await actor.send(restoreFailed
        ? `I could not post the lockdown notice or fully restore permissions in **${guild.name}**. Run ?cancellockdown in the server to retry restoring saved permissions.`
        : `I could not post the lockdown notice in **${guild.name}**, so I restored the saved channel permissions. No channels or messages were deleted.`).catch(() => null);
      return null;
    }
  },
};


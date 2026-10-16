const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storage');

const LOCKDOWNS_FILE = 'lockdowns.json';

module.exports = {
  name: 'cancellockdown',
  description: 'Restore saved channel permissions and lift a lockdown',
  aliases: ['unlockdown'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder()
    .setName('cancellockdown').setDescription('Restore saved channel permissions and lift a lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) },
  async execute(source, _args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild = source.guild;
    const member = source.member;
    const actor = source.user ?? source.author;
    const reply = payload => isSlash ? source.reply({ ...payload, ephemeral: true }) : source.reply(payload);
    if (!guild) return reply({ content: 'Run this command in the locked server.' });
    if (!member?.permissions?.has(PermissionFlagsBits.Administrator))
      return reply({ content: 'You need **Administrator** permission to cancel a lockdown.' });

    const records = storage.read(LOCKDOWNS_FILE, {});
    const record = records[guild.id];
    const existingNotice = guild.channels.cache.find(channel => channel.name === 'lockedown' || channel.id === record?.noticeChannelId);
    if (!record?.active && !existingNotice)
      return reply({ content: 'No active lockdown notice was found in this server.' });

    const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels))
      return reply({ content: 'I need **Manage Channels** permission to lift the lockdown.' });

    let restored = 0;
    let missing = 0;
    const legacy = !Array.isArray(record?.channelOverwrites);
    if (!legacy) {
      for (const saved of record.channelOverwrites) {
        const channel = guild.channels.cache.get(saved.channelId) ?? await guild.channels.fetch(saved.channelId).catch(() => null);
        if (!channel?.permissionOverwrites?.edit) { missing++; continue; }
        const overwrites = Array.isArray(saved.overwrites)
          ? saved.overwrites
          : [{ targetId: guild.roles.everyone.id, permissions: saved.permissions }];
        let channelRestored = true;
        for (const overwrite of overwrites) {
          try {
            await channel.permissionOverwrites.edit(overwrite.targetId, overwrite.permissions, {
              reason: `Conquest lockdown lifted by ${actor.tag ?? actor.username}`,
            });
          } catch (error) {
            console.error(`[LOCKDOWN RESTORE] ${guild.id}/${saved.channelId}: ${error.message}`);
            channelRestored = false;
            break;
          }
        }
        if (channelRestored) restored++;
        else missing++;
      }
    }

    // Older releases deleted the server's channels and did not keep a permission snapshot.
    // Preserve their prior recovery behavior by creating a basic channel when necessary.
    let recoveryChannel = null;
    if (legacy && record?.active) {
      recoveryChannel = guild.channels.cache.find(channel => channel.name === 'general' && channel.type === ChannelType.GuildText) ??
        await guild.channels.create({
          name: 'general', type: ChannelType.GuildText,
          reason: `Legacy lockdown lifted by ${actor.tag ?? actor.username}`,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
          ],
        }).catch(() => null);
    }

    if (existingNotice) {
      const notice = await existingNotice.fetch().catch(() => existingNotice);
      const posted = record?.noticeMessageId ? await notice.messages.fetch(record.noticeMessageId).catch(() => null) : null;
      const recovery = legacy
        ? '**This was a legacy lockdown.** Channels deleted by the earlier command cannot be restored; an Administrator must rebuild them.'
        : `Restored saved send permissions in ${restored} channel(s).${missing ? ` ${missing} channel(s) could not be restored.` : ''}`;
      const embed = new EmbedBuilder().setColor(0x57F287).setTitle('✅  LOCKDOWN LIFTED')
        .setDescription(`The lockdown has been lifted by <@${actor.id}>.\n\n${recovery}`)
        .setTimestamp();
      if (posted) await posted.edit({ content: null, embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
      await notice.setName('lockdown-archive').catch(() => null);
      await notice.setTopic('Lockdown lifted. This notice remains as an archive.').catch(() => null);
    }

    records[guild.id] = { ...(record ?? {}), active: false, cancelledAt: Date.now(), cancelledById: actor.id };
    storage.write(LOCKDOWNS_FILE, records);
    const result = legacy
      ? `Legacy lockdown lifted.${recoveryChannel ? ` ${recoveryChannel} is open.` : ''} Previously deleted channels must be rebuilt manually.`
      : `Lockdown lifted. Restored saved send permissions in ${restored} channel(s).${missing ? ` ${missing} channel(s) could not be restored.` : ''} Existing channels and messages were preserved.`;
    if (isSlash) return reply({ content: result });
    return actor.send(result).catch(() => reply({ content: result }));
  },
};

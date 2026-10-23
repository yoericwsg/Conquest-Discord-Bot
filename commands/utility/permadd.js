const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ChannelType } = require('discord.js');
module.exports = {
  name: 'permadd', description: 'Apply detected public and private channel permissions', aliases: ['channelperms', 'fixperms'], cooldown: 20,
  slash: { data: new SlashCommandBuilder().setName('permadd').setDescription('Apply detected channel permission profiles').setDefaultMemberPermissions(PermissionFlagsBits.Administrator) },
  async execute(source) {
    const slash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand(); const reply = p => slash ? source.reply({ ...p, flags: MessageFlags.Ephemeral }) : source.channel.send(p);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.Administrator)) return reply({ content: 'You need **Administrator** permission.', ephemeral: true });
    const everyone = source.guild.roles.everyone.id; let updated = 0;
    for (const channel of source.guild.channels.cache.values()) {
      if (![ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory].includes(channel.type)) continue;
      const privateChannel = /staff|activity-log|operations-board|reports|business-chat|partner-requests/i.test(channel.name);
      const permissions = privateChannel ? { ViewChannel: false, SendMessages: false } : { ViewChannel: true };
      await channel.permissionOverwrites.edit(everyone, permissions, { reason: `unitClan permadd (${privateChannel ? 'private' : 'public'} profile)` }).then(() => updated++).catch(() => null);
    }
    return reply({ embeds: [new EmbedBuilder().setColor('#57F287').setTitle('🔐 Channel permissions updated').setDescription(`Applied detected permission profiles to **${updated}** channel(s).\n\nPrivate staff, activity, reports, operations, and partner request channels are hidden from @everyone.`)] });
  },
};


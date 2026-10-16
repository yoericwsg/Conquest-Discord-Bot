const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const logger = require('../../systems/logger');

module.exports = {
  name: 'softban',
  description: 'Ban then immediately unban (cleans messages without permanent ban)',
  aliases: ['sb'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('softban')
      .setDescription('Soft-ban: bans then unbans to delete messages')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o => o.setName('user').setDescription('User to softban').setRequired(true))
      .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (1–7)').setMinValue(1).setMaxValue(7))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.BanMembers))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Ban Members**.')], ephemeral: true });

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const reason     = isSlash ? (source.options.getString('reason') ?? 'Softban') : (args.slice(1).join(' ') || 'Softban');
    const days       = isSlash ? (source.options.getInteger('days') ?? 7) : 7;

    if (!targetUser) return reply({ embeds: [error(client, 'No User', 'Mention a user.')], ephemeral: true });

    try {
      if (isSlash) await source.deferReply();
      await source.guild.bans.create(targetUser.id, { reason, deleteMessageSeconds: days * 86400 });
      await source.guild.bans.remove(targetUser.id, 'Softban — auto unban');
      const embed = success(client, '🔄 Soft-Banned', `**${targetUser.tag}** was soft-banned.\n**Reason:** ${reason}\n**Messages Deleted:** ${days} day(s)`);
      isSlash ? source.editReply({ embeds: [embed] }) : source.channel.send({ embeds: [embed] });
      logger.modLog(source.guild, client, 'Softban', targetUser.tag, source.member.user.tag, reason);
    } catch (e) {
      const opts = { embeds: [error(client, 'Failed', e.message)], ephemeral: true };
      isSlash ? source.editReply(opts) : source.channel.send(opts);
    }
  },
};

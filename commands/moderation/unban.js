const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const logger = require('../../systems/logger');

module.exports = {
  name: 'unban',
  description: 'Unban a user by ID',
  aliases: [],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('Unban a user by ID')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption(o => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
    }

    const userId = isSlash ? source.options.getString('user_id') : args[0];
    const reason = isSlash ? (source.options.getString('reason') ?? 'No reason') : (args.slice(1).join(' ') || 'No reason');

    if (!userId) return reply({ embeds: [error(client, 'No ID', 'Provide a user ID.')], ephemeral: true });

    try {
      const ban = await source.guild.bans.fetch(userId).catch(() => null);
      if (!ban) return reply({ embeds: [error(client, 'Not Banned', 'That user is not banned.')], ephemeral: true });

      await source.guild.bans.remove(userId, reason);
      await reply({ embeds: [success(client, 'User Unbanned', `**${ban.user.tag}** has been unbanned.\n**Reason:** ${reason}`)] });
      await logger.modLog(source.guild, client, 'Unban', ban.user.tag, source.member.user.tag, reason, '#57F287');
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

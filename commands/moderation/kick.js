const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const logger = require('../../systems/logger');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server',
  aliases: [],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the kick')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Kick Members** permission.')], ephemeral: true });
    }

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const reason     = isSlash ? (source.options.getString('reason') ?? 'No reason provided') : (args.slice(1).join(' ') || 'No reason provided');

    if (!targetUser) return reply({ embeds: [error(client, 'No User', 'Mention a user to kick.')], ephemeral: true });

    const target = source.guild.members.cache.get(targetUser.id);
    if (!target) return reply({ embeds: [error(client, 'Not Found', 'That user is not in this server.')], ephemeral: true });
    if (!target.kickable) return reply({ embeds: [error(client, 'Cannot Kick', 'I cannot kick this user.')], ephemeral: true });

    try {
      await target.send({ embeds: [error(client, 'Kicked', `You were kicked from **${source.guild.name}**.\n**Reason:** ${reason}`)] }).catch(() => null);
      await target.kick(reason);
      await reply({ embeds: [success(client, 'Member Kicked', `**${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`)] });
      await logger.modLog(source.guild, client, 'Kick', targetUser.tag, source.member.user.tag, reason, '#FEE75C');
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const logger = require('../../systems/logger');

module.exports = {
  name: 'ban',
  description: 'Ban a user from the server',
  aliases: [],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user from the server')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
      .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (0–7)').setMinValue(0).setMaxValue(7)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const member = source.member;
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
    }

    const target = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const reason = isSlash ? (source.options.getString('reason') ?? 'No reason provided') : (args.slice(1).join(' ') || 'No reason provided');
    const days   = isSlash ? (source.options.getInteger('days') ?? 0) : 0;

    if (!target) return reply({ embeds: [error(client, 'No User', 'Mention a user to ban.')], ephemeral: true });

    try {
      await source.guild.members.fetch(target.id)
        .then(m => m.send({ embeds: [error(client, 'Banned', `You were banned from **${source.guild.name}**.\n**Reason:** ${reason}`)] }))
        .catch(() => null);
      await source.guild.bans.create(target.id, { reason, deleteMessageSeconds: days * 86400 });
      await reply({ embeds: [success(client, 'Member Banned', `**${target.tag}** has been banned.\n**Reason:** ${reason}`)] });
      await logger.modLog(source.guild, client, 'Ban', target.tag, source.member.user.tag, reason, '#ED4245');
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', `Could not ban: ${e.message}`)], ephemeral: true });
    }
  },
};

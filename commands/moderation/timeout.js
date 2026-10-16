const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const logger = require('../../systems/logger');

const DURATIONS = { '60s': 60_000, '5m': 300_000, '10m': 600_000, '30m': 1_800_000, '1h': 3_600_000, '6h': 21_600_000, '12h': 43_200_000, '1d': 86_400_000, '1w': 604_800_000 };

module.exports = {
  name: 'timeout',
  description: 'Temporarily timeout a member',
  aliases: ['mute', 'to'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Temporarily timeout a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration').setRequired(true)
        .addChoices(
          { name: '60 seconds', value: '60s' }, { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' }, { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },      { name: '6 hours', value: '6h' },
          { name: '12 hours', value: '12h' },   { name: '1 day', value: '1d' },
          { name: '1 week', value: '1w' }
        ))
      .addStringOption(o => o.setName('reason').setDescription('Reason')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Moderate Members** permission.')], ephemeral: true });
    }

    const targetUser = isSlash ? source.options.getUser('user')  : source.mentions.users.first();
    const durKey     = isSlash ? source.options.getString('duration') : (args[1] ?? '10m');
    const reason     = isSlash ? (source.options.getString('reason') ?? 'No reason provided') : (args.slice(2).join(' ') || 'No reason provided');
    const ms         = DURATIONS[durKey] ?? 600_000;

    if (!targetUser) return reply({ embeds: [error(client, 'No User', 'Mention a user.')], ephemeral: true });

    const target = source.guild.members.cache.get(targetUser.id);
    if (!target?.moderatable) return reply({ embeds: [error(client, 'Cannot Timeout', 'I cannot timeout this user.')], ephemeral: true });

    try {
      await target.timeout(ms, reason);
      await reply({ embeds: [success(client, `Member Timed Out (${durKey})`, `**${targetUser.tag}** has been timed out.\n**Reason:** ${reason}`)] });
      await logger.modLog(source.guild, client, `Timeout (${durKey})`, targetUser.tag, source.member.user.tag, reason, '#FF7300');
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

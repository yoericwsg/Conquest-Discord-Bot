const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'lock',
  description: 'Lock the current channel',
  aliases: [],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('lock')
      .setDescription('Lock the current channel (disable messaging)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addStringOption(o => o.setName('reason').setDescription('Reason for locking')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels** permission.')], ephemeral: true });
    }

    const reason  = isSlash ? (source.options.getString('reason') ?? 'No reason') : (args.join(' ') || 'No reason');
    const channel = source.channel;

    try {
      await channel.permissionOverwrites.edit(source.guild.roles.everyone, { SendMessages: false });
      await reply({ embeds: [success(client, '🔒  Channel Locked', `**#${channel.name}** has been locked.\n**Reason:** ${reason}`)] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

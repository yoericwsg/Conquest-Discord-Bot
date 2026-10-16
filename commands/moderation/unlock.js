const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'unlock',
  description: 'Unlock the current channel',
  aliases: [],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('Unlock the current channel (re-enable messaging)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels** permission.')], ephemeral: true });
    }

    const channel = source.channel;
    try {
      await channel.permissionOverwrites.edit(source.guild.roles.everyone, { SendMessages: null });
      await reply({ embeds: [success(client, '🔓  Channel Unlocked', `**#${channel.name}** has been unlocked.`)] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

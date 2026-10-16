const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'slowmode',
  description: 'Set channel slowmode',
  aliases: ['slow'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set slowmode for the current channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 = disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels**.')], ephemeral: true });

    const secs = isSlash ? source.options.getInteger('seconds') : parseInt(args[0]);
    if (isNaN(secs) || secs < 0 || secs > 21600)
      return reply({ embeds: [error(client, 'Invalid', 'Enter a value between 0 and 21600 seconds.')], ephemeral: true });

    try {
      await source.channel.setRateLimitPerUser(secs);
      const msg = secs === 0 ? 'Slowmode **disabled**.' : `Slowmode set to **${secs}s**.`;
      await reply({ embeds: [success(client, '⏱️ Slowmode Updated', msg)] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

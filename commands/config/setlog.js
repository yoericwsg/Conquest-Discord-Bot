const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'setlog',
  description: 'Set the server log channel',
  aliases: ['logchannel'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setlog')
      .setDescription('Set the channel where moderation logs are sent')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Server** permission.')], ephemeral: true });

    const ch = isSlash ? source.options.getChannel('channel') : source.mentions.channels.first();
    if (!ch) return reply({ embeds: [error(client, 'No Channel', 'Mention a channel.')], ephemeral: true });

    const configs = storage.get('configs.json', source.guild.id, {});
    configs.logChannel = ch.id;
    storage.set('configs.json', source.guild.id, configs);
    await reply({ embeds: [success(client, 'Log Channel Set', `Logs will now be sent to ${ch}.`)] });
  },
};

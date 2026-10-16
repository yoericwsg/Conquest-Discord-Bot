const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'setleave',
  description: 'Configure the goodbye message when members leave',
  aliases: ['leaveset'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setleave')
      .setDescription('Configure the goodbye message')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s => s.setName('channel').setDescription('Set leave channel')
        .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
      .addSubcommand(s => s.setName('message').setDescription('Set leave message')
        .addStringOption(o => o.setName('text').setDescription('Use {user} {username} {server}').setRequired(true)))
      .addSubcommand(s => s.setName('disable').setDescription('Disable leave messages')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Server** permission.')], ephemeral: true });

    const configs = storage.get('configs.json', source.guild.id, {});
    const sub = isSlash ? source.options.getSubcommand() : args[0];

    if (sub === 'channel') {
      const ch = isSlash ? source.options.getChannel('channel') : source.mentions.channels.first();
      if (!ch) return reply({ embeds: [error(client, 'No Channel', 'Mention a channel.')], ephemeral: true });
      configs.leaveChannel = ch.id;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Leave Channel Set', `Goodbye messages will be sent to ${ch}.`)] });
    }
    if (sub === 'message') {
      const text = isSlash ? source.options.getString('text') : args.slice(1).join(' ');
      configs.leaveMessage = text;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Leave Message Set', `Message: ${text}`)] });
    }
    if (sub === 'disable') {
      delete configs.leaveChannel;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Leave Messages Disabled', 'Goodbye messages have been turned off.')] });
    }
  },
};

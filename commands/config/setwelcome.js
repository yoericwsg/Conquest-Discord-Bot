const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'setwelcome',
  description: 'Configure the welcome message',
  aliases: ['welcomeset'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setwelcome')
      .setDescription('Configure the welcome message when members join')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s => s.setName('channel').setDescription('Set welcome channel')
        .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
      .addSubcommand(s => s.setName('message').setDescription('Set welcome message')
        .addStringOption(o => o.setName('text').setDescription('Use {user} {username} {server} {count}').setRequired(true)))
      .addSubcommand(s => s.setName('disable').setDescription('Disable welcome messages')),
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
      configs.welcomeChannel = ch.id;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Welcome Channel Set', `Welcome messages will be sent to ${ch}.`)] });
    }
    if (sub === 'message') {
      const text = isSlash ? source.options.getString('text') : args.slice(1).join(' ');
      configs.welcomeMessage = text;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Welcome Message Set', `Message: ${text}\n\nVariables: \`{user}\` \`{username}\` \`{server}\` \`{count}\``)] });
    }
    if (sub === 'disable') {
      delete configs.welcomeChannel;
      storage.set('configs.json', source.guild.id, configs);
      return reply({ embeds: [success(client, 'Welcome Disabled', 'Welcome messages have been turned off.')] });
    }

    // No sub: show current config
    await reply({ embeds: [panel(client, '👋 Welcome Config', [
      `**Channel:** ${configs.welcomeChannel ? `<#${configs.welcomeChannel}>` : 'Not set'}`,
      `**Message:** ${configs.welcomeMessage || 'Default'}`,
      ``,
      `Use \`setwelcome channel\` and \`setwelcome message\` to configure.`,
    ])] });
  },
};

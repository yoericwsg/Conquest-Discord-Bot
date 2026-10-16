const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { panel, error } = require('../../utils/embed');

const TYPE_NAMES = {
  [ChannelType.GuildText]:        'Text',
  [ChannelType.GuildVoice]:       'Voice',
  [ChannelType.GuildCategory]:    'Category',
  [ChannelType.GuildAnnouncement]:'Announcement',
  [ChannelType.GuildForum]:       'Forum',
  [ChannelType.GuildStageVoice]:  'Stage',
  [ChannelType.GuildThread]:      'Thread',
};

module.exports = {
  name: 'channelinfo',
  description: 'Show info about a channel',
  aliases: ['cinfo', 'ci'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('channelinfo')
      .setDescription('Get information about a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel (default: current)')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const ch      = isSlash ? (source.options.getChannel('channel') ?? source.channel) : (source.mentions.channels.first() ?? source.channel);

    const created = Math.floor(ch.createdTimestamp / 1000);
    const type    = TYPE_NAMES[ch.type] ?? 'Unknown';

    const lines = [
      `**Name:**      \`${ch.name}\``,
      `**ID:**        \`${ch.id}\``,
      `**Type:**      \`${type}\``,
      `**Created:**   <t:${created}:R>`,
    ];

    if (ch.topic) lines.push(`**Topic:**     ${ch.topic}`);
    if ('rateLimitPerUser' in ch) lines.push(`**Slowmode:** \`${ch.rateLimitPerUser}s\``);
    if (ch.parent) lines.push(`**Category:**  \`${ch.parent.name}\``);
    if (ch.type === ChannelType.GuildVoice) {
      lines.push(`**Bitrate:**   \`${ch.bitrate / 1000}kbps\``);
      lines.push(`**Members:**   \`${ch.members.size}\``);
    }

    await reply({ embeds: [panel(client, `📢  Channel Info`, lines)] });
  },
};

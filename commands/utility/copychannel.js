const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

function serializeOverwrites(ch) {
  return [...ch.permissionOverwrites.cache.values()].map(ow => {
    const isRole = ow.type === 0;
    const subject = isRole
      ? ch.guild.roles.cache.get(ow.id)
      : null;
    return {
      type: isRole ? 'role' : 'member',
      name: isRole ? (subject?.name ?? '@everyone') : null,
      everyoneRole: ow.id === ch.guild.id,
      allow: ow.allow.bitfield.toString(),
      deny:  ow.deny.bitfield.toString(),
    };
  }).filter(o => o.type === 'role'); // skip user-specific overwrites cross-server
}

module.exports = {
  name: 'copychannel',
  description: 'Copy a channel to your clipboard',
  aliases: ['copych'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('copychannel')
      .setDescription('Copy a channel configuration to your clipboard')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption(o => o.setName('channel').setDescription('Channel to copy (default: current)')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const userId  = (source.user ?? source.author).id;
    if (!source.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels**.')], ephemeral: true });

    const ch = isSlash
      ? (source.options.getChannel('channel') ?? source.channel)
      : (source.mentions.channels.first() ?? source.channel);

    const snap = {
      type: 'channel',
      copiedAt: Date.now(),
      fromServer: source.guild.name,
      channel: {
        name:        ch.name,
        channelType: ch.type,
        topic:       ch.topic ?? null,
        nsfw:        ch.nsfw ?? false,
        slowmode:    ch.rateLimitPerUser ?? 0,
        bitrate:     ch.bitrate ?? null,
        userLimit:   ch.userLimit ?? null,
        parentName:  ch.parent?.name ?? null,
        overwrites:  serializeOverwrites(ch),
      },
    };

    const clip = storage.get('clipboard.json', userId, {});
    clip.channel = snap;
    storage.set('clipboard.json', userId, clip);

    await reply({ embeds: [panel(client, '📋  Channel Copied', [
      `**Channel:**  \`#${ch.name}\``,
      `**Type:**     \`${ch.type}\``,
      ch.topic ? `**Topic:**    ${ch.topic}` : null,
      ch.parent ? `**Category:** \`${ch.parent.name}\`` : null,
      `**Overwrites:** \`${snap.channel.overwrites.length}\` role overwrite(s)`,
      ``,
      `Use \`?paste\` in another server to create this channel.`,
    ].filter(Boolean))] });
  },
};

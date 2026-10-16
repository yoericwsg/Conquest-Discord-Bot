const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { error, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

// Channel types that cannot be re-created directly (threads live inside channels)
const SKIP_TYPES = new Set([
  ChannelType.GuildNewsThread,
  ChannelType.GuildPublicThread,
  ChannelType.GuildPrivateThread,
  ChannelType.GuildDirectory,
]);

// Safely serialize permission overwrites (some channel types don't have them)
function serializeOverwrites(ch) {
  if (!ch.permissionOverwrites?.cache) return [];
  return [...ch.permissionOverwrites.cache.values()].map(ow => {
    const isRole     = ow.type === 0;
    const isEveryone = ow.id === ch.guild?.id;
    const subject    = isRole && !isEveryone ? ch.guild?.roles.cache.get(ow.id) : null;
    return {
      type:  isEveryone ? 'everyone' : (isRole ? 'role' : null),
      name:  isEveryone ? '@everyone' : (subject?.name ?? null),
      allow: ow.allow.bitfield.toString(),
      deny:  ow.deny.bitfield.toString(),
    };
  }).filter(o => o.type !== null);
}

module.exports = {
  name: 'copyserver',
  description: 'Copy the entire server structure to your clipboard',
  aliases: ['cloneserver', 'serverbackup'],
  cooldown: 15,
  slash: {
    data: new SlashCommandBuilder()
      .setName('copyserver')
      .setDescription('Copy the entire server layout (roles, channels, permissions) to clipboard')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const userId  = (source.user ?? source.author).id;

    if (!source.member.permissions.has(PermissionFlagsBits.Administrator))
      return (isSlash ? source.reply.bind(source) : source.channel.send.bind(source.channel))(
        { embeds: [error(client, 'No Permission', 'You need **Administrator**.')], ephemeral: true }
      );

    if (isSlash) await source.deferReply();

    const guild = source.guild;

    // Ensure full channel + role cache
    await guild.roles.fetch().catch(() => null);
    await guild.channels.fetch().catch(() => null);

    // ── Roles (sorted lowest → highest, skip @everyone)
    const roles = [...guild.roles.cache.values()]
      .filter(r => r.id !== guild.id)
      .sort((a, b) => a.position - b.position)
      .map(r => ({
        name:        r.name,
        color:       r.color,
        hoist:       r.hoist,
        mentionable: r.mentionable,
        permissions: r.permissions.bitfield.toString(),
        position:    r.position,
      }));

    // ── Categories
    const categories = [...guild.channels.cache.values()]
      .filter(c => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        name:       c.name,
        position:   c.position,
        overwrites: serializeOverwrites(c),
      }));

    // ── Channels (skip threads and special types)
    const channels = [...guild.channels.cache.values()]
      .filter(c => c.type !== ChannelType.GuildCategory && !SKIP_TYPES.has(c.type))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(c => ({
        name:        c.name,
        channelType: c.type,
        topic:       c.topic ?? null,
        nsfw:        c.nsfw ?? false,
        slowmode:    c.rateLimitPerUser ?? 0,
        bitrate:     c.bitrate ?? null,
        userLimit:   c.userLimit ?? 0,
        position:    c.position ?? 0,
        parentName:  c.parent?.name ?? null,
        overwrites:  serializeOverwrites(c),
      }));

    const snap = {
      type:       'server',
      copiedAt:   Date.now(),
      fromServer: guild.name,
      iconURL:    guild.iconURL({ size: 512 }) ?? null,
      roles,
      categories,
      channels,
    };

    const clip = storage.get('clipboard.json', userId, {});
    clip.server = snap;
    storage.set('clipboard.json', userId, clip);

    const send = opts => isSlash ? source.editReply(opts) : source.channel.send(opts);
    await send({ embeds: [panel(client, '📋  Server Copied', [
      `**Server:**     \`${guild.name}\``,
      `**Roles:**      \`${roles.length}\``,
      `**Categories:** \`${categories.length}\``,
      `**Channels:**   \`${channels.length}\``,
      ``,
      `✅ Saved to your personal clipboard.`,
      `Go to the target server and run \`?paste server\` to apply.`,
    ])] });
  },
};

const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
} = require('discord.js');
const { panel, error } = require('../../utils/embed');
const { isApplicationOwner } = require('../../systems/owner-access');
const { broadcastEmbed } = require('../../systems/announcement-delivery');

const COLORS = { red: '#ED4245', green: '#57F287', blue: '#5865F2', yellow: '#FEE75C', purple: '#9B59B6', pink: '#EB459E', default: '#2B2D31' };

module.exports = {
  name: 'announce',
  description: 'Send a beautiful announcement embed to a channel',
  aliases: ['ann', 'broadcast'],
  cooldown: 10,
  slash: {
    data: new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Send a beautiful announcement to a channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption(o => o.setName('title').setDescription('Announcement title').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Announcement body').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel (defaults to current)').setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption(o => o.setName('color').setDescription('Embed colour').setRequired(false)
        .addChoices(
          { name: '🔵 Blue (default)', value: 'blue' },
          { name: '🟢 Green',  value: 'green' },
          { name: '🔴 Red',    value: 'red' },
          { name: '🟡 Yellow', value: 'yellow' },
          { name: '🟣 Purple', value: 'purple' },
          { name: '🩷 Pink',   value: 'pink' },
        ))
      .addStringOption(o => o.setName('image_url').setDescription('HTTPS image or GIF URL (optional)').setMaxLength(2048).setRequired(false))
      .addStringOption(o => o.setName('ping').setDescription('Role to ping (ID or @everyone)').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!source.guild && !isSlash) {
      if (!await isApplicationOwner(client, actor.id))
        return reply({ content: 'This DM command is restricted to the verified application owner/team.' });
      const selector = String(args[0] ?? '').toLowerCase();
      if (selector === 'servers') {
        const guilds = [...client.guilds.cache.values()];
        if (!guilds.length) return reply({ content: 'The bot is not in any servers.' });
        for (let i = 0; i < guilds.length; i += 10) {
          const list = guilds.slice(i, i + 10).map(g => `• **${g.name.slice(0, 100)}** — ${g.id}`);
          await reply({ content: `Bot is in ${guilds.length} server(s) · page ${Math.floor(i / 10) + 1}/${Math.ceil(guilds.length / 10)}:\n${list.join('\n')}` });
        }
        return;
      }
      if (!selector || args.length < 2)
        return reply({ content: 'Usage: `?announce servers`, `?announce all <reason>`, or `?announce <serverID[,serverID...]> <reason>`.' });

      const targets = selector === 'all'
        ? [...client.guilds.cache.values()]
        : selector.split(',').map(id => client.guilds.cache.get(id.trim())).filter(Boolean);
      const requested = selector === 'all' ? targets.length : selector.split(',').length;
      if (!targets.length || targets.length !== requested)
        return reply({ content: 'No servers matched. Use `?announce servers` to list their IDs.' });
      const reason = args.slice(1).join(' ').trim().slice(0, 1500);
      const embed = panel(client, '📢  unitClan Announcement', reason, COLORS.blue)
        .setFooter({ text: `Announced by ${actor.tag ?? actor.username}` }).setTimestamp();
      const results = await broadcastEmbed(client, embed, `📢 **Announcement**\n${reason}`, targets);
      const sent = results.filter(r => r.sent).length;
      return reply({ content: `Announcement delivered to ${sent}/${targets.length} selected server(s).${sent < targets.length ? ` ${targets.length - sent} could not be delivered; check configured announcement/system channels and bot permissions.` : ''}` });
    }

    if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Messages**.')] });

    let title, body, targetChannel, colorKey, pingText, imageUrl;

    if (isSlash) {
      title         = source.options.getString('title');
      body          = source.options.getString('message');
      targetChannel = source.options.getChannel('channel') ?? source.channel;
      colorKey      = source.options.getString('color') ?? 'blue';
      pingText      = source.options.getString('ping') ?? null;
      imageUrl      = source.options.getString('image_url');
    } else {
      // ?announce #channel title | message | HTTPS image or GIF URL
      const chanMention = source.mentions.channels.first();
      targetChannel     = chanMention ?? source.channel;
      const rest        = args.filter(a => !a.startsWith('<#')).join(' ');
      const [titlePart, bodyPart, imagePart] = rest.split('|');
      title             = titlePart?.trim() || 'Announcement';
      body              = bodyPart?.trim() || titlePart?.trim() || '...';
      imageUrl          = imagePart?.trim() || undefined;
      colorKey          = 'blue';
      pingText          = source.mentions.roles.first() ? `<@&${source.mentions.roles.first().id}>` : null;
    }

    if (imageUrl && (!/^https:\/\/\S+$/i.test(imageUrl) || imageUrl.length > 2048)) {
      return reply({ embeds: [error(client, 'Invalid image URL', 'Use a valid HTTPS image or GIF URL.')] });
    }

    const color  = COLORS[colorKey] ?? COLORS.blue;
    const embed  = panel(client, `📢  ${title}`, body, color, imageUrl)
      .setFooter({ text: `Announced by ${isSlash ? source.user.tag : source.author.tag}` })
      .setTimestamp();

    try {
      await targetChannel.send({ content: pingText ?? undefined, embeds: [embed] });
      await reply({ embeds: [panel(client, '✅  Sent', `Announcement posted in <#${targetChannel.id}>.`)], ephemeral: true });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', `Could not send to <#${targetChannel.id}>: ${e.message}`)] });
    }
  },
};


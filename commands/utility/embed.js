const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { error } = require('../../utils/embed');

module.exports = {
  name: 'embed',
  description: 'Send a custom embed message',
  aliases: ['say-embed', 'mkembed'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Send a custom embed message')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption(o => o.setName('description').setDescription('Embed body text').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title (optional)').setRequired(false))
      .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #5865F2 (optional)').setRequired(false))
      .addStringOption(o => o.setName('image_url').setDescription('HTTPS image or GIF URL (optional)').setMaxLength(2048).setRequired(false)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return reply({ embeds: [error(client, 'No Permission', 'Need **Manage Messages** to send embeds.')] });

    let title, description, color, imageUrl;
    if (isSlash) {
      description = source.options.getString('description');
      title       = source.options.getString('title');
      color       = source.options.getString('color') ?? '#5865F2';
      imageUrl    = source.options.getString('image_url');
    } else {
      // ?embed Title | Description | HTTPS image or GIF URL
      const raw = args.join(' ');
      if (!raw) return reply({ embeds: [error(client, 'Missing Text', 'Usage: `?embed Title | Description | https://example.com/image.gif`')] });
      if (raw.includes('|')) {
        const [t, body, ...extras] = raw.split('|');
        title = t.trim();
        description = (body ?? '').trim();
        imageUrl = extras.join('|').trim() || undefined;
      } else {
        description = raw;
      }
      color = '#5865F2';
    }

    if (imageUrl && (!/^https:\/\/\S+$/i.test(imageUrl) || imageUrl.length > 2048)) {
      return reply({ embeds: [error(client, 'Invalid image URL', 'Use a valid HTTPS image or GIF URL.')] });
    }
    const embed = new EmbedBuilder().setDescription(description).setColor(color);
    if (title) embed.setTitle(title);
    if (imageUrl) embed.setImage(imageUrl);

    if (isSlash) return reply({ embeds: [embed] });
    await source.channel.send({ embeds: [embed] });
    await source.delete().catch(() => null);
  },
};

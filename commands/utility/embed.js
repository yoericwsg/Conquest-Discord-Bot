const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { error, base, styleTitle } = require('../../utils/embed');

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

    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanDescription || cleanDescription.length > 4096 || cleanTitle.length > 256) {
      return reply({ embeds: [error(client, 'Embed text is too long', 'Keep the description under 4,096 characters and the title under 256 characters.')] });
    }
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      return reply({ embeds: [error(client, 'Invalid color', 'Use a six-digit hex color such as `#5865F2`.')] });
    }
    if (imageUrl && (!/^https:\/\/\S+$/i.test(imageUrl) || imageUrl.length > 2048)) {
      return reply({ embeds: [error(client, 'Invalid image URL', 'Use a valid HTTPS image or GIF URL.')] });
    }
    const embed = base(client).setDescription(cleanDescription).setColor(color);
    if (cleanTitle) embed.setTitle(styleTitle(cleanTitle));
    if (imageUrl) embed.setImage(imageUrl);

    if (isSlash) return reply({ embeds: [embed] });
    await source.channel.send({ embeds: [embed] });
    await source.delete().catch(() => null);
  },
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { success, error, info } = require('../../utils/embed');
const storage = require('../../utils/storage');
const cfg = require('../../config.json');

module.exports = {
  name: 'setverify',
  description: 'Set up a verification channel with a button',
  aliases: ['verifysetup', 'setupverify'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setverify')
      .setDescription('Set up a verification system with a button')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName('channel').setDescription('Channel to send the verify embed to').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to give when verified').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Custom verify message (optional)').setRequired(false))
      .addStringOption(o => o.setName('color').setDescription('Embed color hex (e.g. #00FF00, optional)').setRequired(false)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'Need **Manage Server** to set up verification.')] });

    let verifyChannel, verifyRole, customMsg, color;

    if (isSlash) {
      verifyChannel = source.options.getChannel('channel');
      verifyRole    = source.options.getRole('role');
      customMsg     = source.options.getString('message');
      color         = source.options.getString('color') ?? cfg.embedColor;
    } else {
      verifyChannel = source.mentions.channels.first();
      verifyRole    = source.mentions.roles.first();
      // args after channel and role mention
      const cleanArgs = args.filter(a => !a.startsWith('<'));
      customMsg = cleanArgs.join(' ') || null;
      color     = cfg.embedColor;
    }

    if (!verifyChannel) return reply({ embeds: [error(client, 'No Channel', 'Mention the channel to post verification in.')] });
    if (!verifyRole)    return reply({ embeds: [error(client, 'No Role', 'Mention the role to give upon verification.')] });

    // Save config
    const configs = storage.get('configs.json', source.guild.id, {});
    configs.verifyChannel = verifyChannel.id;
    configs.verifyRole    = verifyRole.id;
    storage.set('configs.json', source.guild.id, configs);

    // Build and send the verify embed
    const verifyMsg = customMsg ||
      `Welcome to **${source.guild.name}**!\n\nClick the button below to verify and gain access to the server.`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('✅  Verification')
      .setDescription(verifyMsg)
      .setThumbnail(source.guild.iconURL({ size: 256 }))
      .setFooter({ text: `Conquest ${cfg.version}`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_${source.guild.id}`)
        .setLabel('✅  Verify Me')
        .setStyle(ButtonStyle.Success),
    );

    try {
      await verifyChannel.send({ embeds: [embed], components: [row] });
    } catch {
      return reply({ embeds: [error(client, 'Send Failed', `I can't send messages in ${verifyChannel}. Check my permissions.`)] });
    }

    await reply({ embeds: [success(client, 'Verification Set Up',
      `Verify embed sent to ${verifyChannel}.\nRole: ${verifyRole}\nUsers click the button to get verified.`)] });
  },
};

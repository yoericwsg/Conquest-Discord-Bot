const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../../utils/storage');
const { resolveUsername, validateServerLink } = require('../../systems/roblox');

function prefixOptions(args) {
  const username = args.shift();
  const pingIndex = args.findIndex(value => value.toLowerCase() === 'ping');
  const ping = pingIndex !== -1;
  if (ping) args.splice(pingIndex, 1);
  const serverLinkIndex = args.findIndex(value => /^https:\/\//i.test(value));
  const serverLink = serverLinkIndex === -1 ? null : args.splice(serverLinkIndex, 1)[0];
  return { username, ping, serverLink, note: args.join(' ').trim() };
}

module.exports = {
  name: 'raidstart',
  description: 'Start a clan raid callout for a Roblox username',
  aliases: ['clanraid', 'raid'],
  cooldown: 20,
  slash: {
    data: new SlashCommandBuilder()
      .setName('raidstart')
      .setDescription('Start a Roblox clan raid callout')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption(o => o.setName('username').setDescription('Roblox username to target').setRequired(true))
      .addBooleanOption(o => o.setName('ping').setDescription('Mention @here in the raid channel'))
      .addStringOption(o => o.setName('server_link').setDescription('Roblox game or private server link'))
      .addStringOption(o => o.setName('note').setDescription('Optional instructions for the clan').setMaxLength(500)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply(payload) : source.channel.send(payload);
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return reply({ content: 'Manage Server permission is required to start a clan raid.', ephemeral: isSlash });
    }

    const options = isSlash ? {
      username: source.options.getString('username'),
      ping: source.options.getBoolean('ping') ?? false,
      serverLink: source.options.getString('server_link'),
      note: source.options.getString('note') ?? '',
    } : prefixOptions(args);
    if (!options.username) return reply({ content: 'Usage: `?raidstart <roblox_username> [ping] [server_link] [note]`', ephemeral: isSlash });

    try {
      const user = await resolveUsername(options.username);
      const serverLink = validateServerLink(options.serverLink);
      const event = {
        username: user.name,
        displayName: user.displayName,
        userId: user.id,
        profileUrl: user.profileUrl,
        serverLink,
        note: options.note || 'Follow clan leadership instructions in this channel.',
        startedBy: source.user?.tag ?? source.author?.tag ?? 'Server staff',
        startedAt: Date.now(),
      };
      storage.set('raid-events.json', source.guild.id, event);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('Clan raid started')
        .setDescription(`Target: [${user.displayName} (@${user.name})](${user.profileUrl})\n\n${event.note}`)
        .addFields(
          { name: 'Roblox user ID', value: user.id, inline: true },
          { name: 'Started by', value: event.startedBy, inline: true },
          { name: 'Server link', value: serverLink ? `[Join Roblox server](${serverLink})` : 'No server link attached', inline: false },
        )
        .setTimestamp();
      const components = serverLink ? [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Join Roblox server').setStyle(ButtonStyle.Link).setURL(serverLink),
      )] : [];
      const content = options.ping ? '@here' : undefined;
      return reply({ content, embeds: [embed], components, allowedMentions: options.ping ? { parse: ['everyone'] } : { parse: [] } });
    } catch (error) {
      return reply({ content: `Raid could not start: ${error.message}`, ephemeral: isSlash });
    }
  },
};

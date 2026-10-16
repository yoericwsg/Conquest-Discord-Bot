const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

const EMOJI_RE   = /<a?:(\w+):(\d+)>/g;
const UNICODE_RE = /\p{Emoji_Presentation}/u;

module.exports = {
  name: 'steal',
  description: 'Add an emoji from another server to this one',
  aliases: ['addemoji', 'yoink'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('steal')
      .setDescription('Steal a custom emoji into this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
      .addStringOption(o =>
        o.setName('emoji').setDescription('The custom emoji to steal').setRequired(true))
      .addStringOption(o =>
        o.setName('name').setDescription('Override the emoji name').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild    = source.guild;
    const member   = source.member;
    const input    = isSlash ? source.options.getString('emoji') : args[0];
    const nameArg  = isSlash ? source.options.getString('name') : args[1];

    const reply = opts =>
      source.reply?.(opts) ?? source.channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.ManageGuildExpressions))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Expressions**.')] });

    if (!input)
      return reply({ embeds: [error(client, 'No Emoji', 'Provide a custom emoji to steal, e.g. `?steal :cool:`')] });

    // Try to parse as a custom emoji
    const match = [...input.matchAll(EMOJI_RE)];
    if (!match.length)
      return reply({ embeds: [error(client, 'Custom Emojis Only', 'You can only steal custom (non-unicode) emojis.')] });

    const [, emojiName, emojiId] = match[0];
    const animated = input.startsWith('<a:');
    const ext       = animated ? 'gif' : 'png';
    const url        = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
    const finalName  = (nameArg ?? emojiName).replace(/\W/g, '_').slice(0, 32) || 'stolen_emoji';

    try {
      const created = await guild.emojis.create({ attachment: url, name: finalName, reason: `Stolen by ${isSlash ? source.user.tag : source.author.tag}` });
      return reply({ embeds: [success(client, '✅  Emoji Stolen!',
        `Added **:${created.name}:** ${created} to this server.\nID: \`${created.id}\``)] });
    } catch (e) {
      return reply({ embeds: [error(client, 'Failed', `Could not add emoji: ${e.message}`)] });
    }
  },
};

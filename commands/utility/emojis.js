const { SlashCommandBuilder } = require('discord.js');
const { base, SEP, info } = require('../../utils/embed');

module.exports = {
  name: 'emojis',
  description: 'List all custom emojis in this server',
  aliases: ['emotes', 'listemojis'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('emojis')
      .setDescription('List all custom emojis in this server'),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const guild   = source.guild;

    const emojis = [...guild.emojis.cache.values()];
    if (!emojis.length)
      return reply({ embeds: [info(client, '😶 No Emojis', [], 'This server has no custom emojis yet.')] });

    const staticE  = emojis.filter(e => !e.animated).map(e => e.toString());
    const animated = emojis.filter(e => e.animated).map(e => e.toString());

    const chunks = [];
    let block = `${SEP}\n`;
    if (staticE.length)  block += `**Static (${staticE.length}):**\n${staticE.join(' ')}\n\n`;
    if (animated.length) block += `**Animated (${animated.length}):**\n${animated.join(' ')}\n`;
    block += SEP;

    const embed = base(client)
      .setTitle(`😀 Server Emojis (${emojis.length})`)
      .setDescription(block.length > 4000 ? block.slice(0, 4000) + '\n...' : block);

    await reply({ embeds: [embed] });
  },
};

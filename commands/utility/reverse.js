const { SlashCommandBuilder } = require('discord.js');
const { error } = require('../../utils/embed');

module.exports = {
  name: 'reverse',
  description: 'Reverse a piece of text',
  aliases: ['reversetext'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('reverse')
      .setDescription('Reverse a piece of text')
      .addStringOption(o => o.setName('text').setDescription('Text to reverse').setRequired(true)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const text = isSlash ? source.options.getString('text') : args.join(' ');
    if (!text) return reply({ embeds: [error(client, 'Missing Text', 'Give me something to reverse.')] });

    const reversed = [...text].reverse().join('');
    await reply(reversed.length > 1900 ? reversed.slice(0, 1900) : reversed);
  },
};

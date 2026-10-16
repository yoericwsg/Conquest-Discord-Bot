const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'dice',
  description: 'Roll dice (e.g. 2d6, 1d20)',
  aliases: ['roll', 'die'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('dice')
      .setDescription('Roll one or more dice')
      .addIntegerOption(o => o.setName('sides').setDescription('Sides per die (2–100, default 6)').setMinValue(2).setMaxValue(100))
      .addIntegerOption(o => o.setName('count').setDescription('Number of dice (1–10, default 1)').setMinValue(1).setMaxValue(10)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const sides = isSlash ? (source.options.getInteger('sides') ?? 6) : parseInt(args[0]) || 6;
    const count = isSlash ? (source.options.getInteger('count') ?? 1) : parseInt(args[1]) || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    const lines = [`🎲  **${count}d${sides}**`, ``, `Rolls: ${rolls.map(r => `\`${r}\``).join(' ')}`];
    if (count > 1) lines.push(`Total: **${total}**`);
    await reply({ embeds: [panel(client, '🎲  Dice Roll', lines)] });
  },
};

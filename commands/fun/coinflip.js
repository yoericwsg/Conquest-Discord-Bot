const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'coinflip',
  description: 'Flip a coin',
  aliases: ['cf', 'flip'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Flip a coin — heads or tails')
      .addStringOption(o =>
        o.setName('call').setDescription('Your call')
          .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })
      ),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const call   = isSlash ? source.options.getString('call') : (args[0]?.toLowerCase());
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won    = call ? call === result : null;
    const emoji  = result === 'heads' ? '🪙' : '🟤';
    const color  = won === null ? '#5865F2' : won ? '#57F287' : '#ED4245';

    const lines = [
      `${emoji}  **Result:** ${result.charAt(0).toUpperCase() + result.slice(1)}`,
    ];
    if (call) lines.push(`🎯  **Your Call:** ${call.charAt(0).toUpperCase() + call.slice(1)}`, `${won ? '✅' : '❌'}  **Outcome:** ${won ? 'Correct!' : 'Wrong!'}`);

    await reply({ embeds: [panel(client, '🪙  Coin Flip', lines, color)] });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { panel, error } = require('../../utils/embed');

function safeEval(expr) {
  // Allow only numbers, operators, spaces, dots, parens
  if (!/^[\d\s+\-*/().%^]+$/.test(expr)) throw new Error('Invalid characters');
  // Replace ^ with ** for exponentiation
  const sanitized = expr.replace(/\^/g, '**');
  // Evaluate safely
  // eslint-disable-next-line no-new-func
  const result = Function('"use strict"; return (' + sanitized + ')')();
  if (!isFinite(result)) throw new Error('Result is not finite');
  return result;
}

module.exports = {
  name: 'calc',
  description: 'Evaluate a math expression',
  aliases: ['calculate', 'math'],
  cooldown: 2,
  slash: {
    data: new SlashCommandBuilder()
      .setName('calc')
      .setDescription('Evaluate a math expression')
      .addStringOption(o => o.setName('expression').setDescription('e.g. 2+2, (5*3)/2, 2^10').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const expr    = isSlash ? source.options.getString('expression') : args.join(' ');
    if (!expr) return reply({ content: 'Provide an expression.', ephemeral: true });

    try {
      const result = safeEval(expr.replace(/x/gi, '*'));
      await reply({ embeds: [panel(client, '🔢  Calculator', [
        `**Input:**   \`${expr}\``,
        `**Result:**  \`${result}\``,
      ])] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Invalid Expression', e.message)], ephemeral: true });
    }
  },
};

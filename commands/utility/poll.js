const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'poll',
  description: 'Create a quick yes/no or choice poll',
  aliases: ['vote'],
  cooldown: 10,
  slash: {
    data: new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a poll')
      .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption(o => o.setName('options').setDescription('Comma-separated options (leave blank for yes/no)')),
  },
  async execute(source, args, client) {
    const isSlash    = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply      = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const question   = isSlash ? source.options.getString('question') : args[0];
    const optionsRaw = isSlash ? source.options.getString('options') : args.slice(1).join(' ');

    if (!question) return reply({ content: 'Provide a question.', ephemeral: true });

    const choices = optionsRaw
      ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 9)
      : null;

    const numbers = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
    let lines;
    let reactEmojis;

    if (choices && choices.length >= 2) {
      lines = choices.map((c, i) => `${numbers[i]}  ${c}`);
      reactEmojis = numbers.slice(0, choices.length);
    } else {
      lines = ['👍  Yes', '👎  No'];
      reactEmojis = ['👍', '👎'];
    }

    const embed = panel(client, `📊  Poll: ${question}`, ['', ...lines, '']);
    const msg = isSlash
      ? await source.channel.send({ embeds: [embed] }).then(async m => { await source.reply({ content: '✅ Poll created!', ephemeral: true }); return m; })
      : await source.channel.send({ embeds: [embed] });

    for (const emoji of reactEmojis) {
      await msg.react(emoji).catch(() => null);
    }
  },
};

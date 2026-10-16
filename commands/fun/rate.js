const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');
const { progressBar } = require('../../utils/embed');

module.exports = {
  name: 'rate',
  description: 'Rate anything out of 100',
  aliases: ['rateit', 'score'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('rate')
      .setDescription('Rate anything out of 100')
      .addStringOption(o => o.setName('thing').setDescription('What to rate').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const thing   = isSlash ? source.options.getString('thing') : args.join(' ');
    if (!thing) return reply({ content: 'What do you want rated?', ephemeral: true });

    const score = Math.floor(Math.random() * 101);
    const color = score >= 70 ? '#57F287' : score >= 40 ? '#FEE75C' : '#ED4245';
    const label = score >= 90 ? 'Outstanding! 🔥' : score >= 70 ? 'Pretty good! 👍' : score >= 50 ? 'Meh, okay.' : score >= 30 ? 'Not great.' : 'Terrible! 💀';

    await reply({
      embeds: [panel(client, '⭐  Rating', [
        `**${thing}**`,
        ``,
        `${progressBar(score, 100)} **${score}/100**`,
        ``,
        `*${label}*`,
      ], color)],
    });
  },
};

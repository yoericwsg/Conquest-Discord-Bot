const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

const RESPONSES = [
  { text: 'It is certain.',         type: 'pos' },
  { text: 'Without a doubt.',       type: 'pos' },
  { text: 'Yes, definitely.',       type: 'pos' },
  { text: 'You may rely on it.',    type: 'pos' },
  { text: 'As I see it, yes.',      type: 'pos' },
  { text: 'Most likely.',           type: 'pos' },
  { text: 'Signs point to yes.',    type: 'pos' },
  { text: 'Reply hazy, try again.', type: 'neu' },
  { text: 'Ask again later.',       type: 'neu' },
  { text: 'Cannot predict now.',    type: 'neu' },
  { text: 'Better not tell you.',   type: 'neu' },
  { text: "Don't count on it.",     type: 'neg' },
  { text: 'My reply is no.',        type: 'neg' },
  { text: 'Very doubtful.',         type: 'neg' },
  { text: 'Outlook not so good.',   type: 'neg' },
];

const COLORS = { pos: '#57F287', neu: '#FEE75C', neg: '#ED4245' };
const ICONS  = { pos: '✅', neu: '🟡', neg: '❌' };

module.exports = {
  name: '8ball',
  description: 'Ask the magic 8-ball a question',
  aliases: ['eightball', 'ask'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('8ball')
      .setDescription('Ask the magic 8-ball')
      .addStringOption(o => o.setName('question').setDescription('Your yes/no question').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply    = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const question = isSlash ? source.options.getString('question') : args.join(' ');

    if (!question) return reply({ content: 'Ask me a question!', ephemeral: true });

    const r = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    await reply({
      embeds: [panel(client, '🎱  Magic 8-Ball', [
        `❓  **Question:** ${question}`,
        ``,
        `${ICONS[r.type]}  **Answer:** ${r.text}`,
      ], COLORS[r.type])],
    });
  },
};

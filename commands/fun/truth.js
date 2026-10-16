const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

const TRUTHS = [
  'What is the most embarrassing thing you have ever done?',
  'Have you ever lied to get out of trouble? What was it?',
  'What is something you have never told anyone?',
  'What is your biggest fear in life?',
  'Have you ever cheated on a test or exam?',
  'What is the worst gift you have ever received?',
  'Who in this server do you find the most annoying?',
  'What is your most embarrassing childhood memory?',
  'Have you ever blamed someone else for something you did?',
  'What is the most childish thing you still do?',
  'What is the last lie you told?',
  'What bad habit do you have that you would hate for others to know?',
  'What is the weirdest thing you have searched online?',
  'Have you ever ghosted someone?',
  'What is something you are secretly proud of but would not admit publicly?',
];

module.exports = {
  name: 'truth',
  description: 'Get a truth question for truth or dare',
  aliases: ['t'],
  cooldown: 3,
  slash: { data: new SlashCommandBuilder().setName('truth').setDescription('Get a random truth question') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const q = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    await reply({ embeds: [panel(client, '🙊  Truth', [q], '#5865F2')] });
  },
};

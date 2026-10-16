const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

const QUESTIONS = [
  ['Be able to fly', 'Be invisible'],
  ['Live without music', 'Live without the internet'],
  ['Fight one horse-sized duck', '100 duck-sized horses'],
  ['Always be 10 minutes late', 'Always be 20 minutes early'],
  ['Have super strength', 'Have super speed'],
  ['Know how you die', 'Know when you die'],
  ['Lose all your memories', 'Never make any new ones'],
  ['Be always hot', 'Be always cold'],
  ['Speak all languages', 'Play all instruments'],
  ['Only eat sweet food forever', 'Only eat spicy food forever'],
  ['Never use social media', 'Never watch another movie'],
  ['Have a pause button for your life', 'Have a rewind button'],
  ['Be famous but hated', 'Unknown but loved'],
  ['Live in 2100', 'Live in 1800'],
  ['Talk to animals', 'Know all human languages'],
];

module.exports = {
  name: 'wyr',
  description: 'Would you rather...?',
  aliases: ['wouldyourather'],
  cooldown: 3,
  slash: { data: new SlashCommandBuilder().setName('wyr').setDescription('Get a would-you-rather question') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const [a, b]  = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await reply({ embeds: [panel(client, '🤔  Would You Rather...', [`🅰️  ${a}`, ``, `**  OR  **`, ``, `🅱️  ${b}`])] });
  },
};

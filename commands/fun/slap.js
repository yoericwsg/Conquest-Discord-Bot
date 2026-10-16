const { SlashCommandBuilder } = require('discord.js');
const { base } = require('../../utils/embed');

const GIFS = [
  'https://media.giphy.com/media/xUO4t2gkzBrkBuGyHu/giphy.gif',
  'https://media.giphy.com/media/jLeyZWgtwgr2U/giphy.gif',
  'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
  'https://media.giphy.com/media/uqSU9IEYEKAbS/giphy.gif',
];

module.exports = {
  name: 'slap',
  description: 'Slap someone',
  aliases: ['smack'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('slap')
      .setDescription('Slap someone')
      .addUserOption(o => o.setName('user').setDescription('Who to slap').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const target  = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const sender  = source.user ?? source.author;
    const gif     = GIFS[Math.floor(Math.random() * GIFS.length)];

    if (!target) return reply({ content: 'Who do you want to slap?', ephemeral: true });
    if (target.id === sender.id) return reply({ content: '😶 Slapping yourself? Interesting life choice.', ephemeral: true });

    await reply({
      embeds: [base(client)
        .setColor('#ED4245')
        .setDescription(`👋 **${sender.username}** slaps **${target.username}**!`)
        .setImage(gif)],
    });
  },
};

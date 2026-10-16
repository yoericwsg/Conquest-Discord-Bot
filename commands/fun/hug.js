const { SlashCommandBuilder } = require('discord.js');
const { base } = require('../../utils/embed');

const GIFS = [
  'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
  'https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif',
  'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif',
  'https://media.giphy.com/media/3bqtLDeiDtwhq/giphy.gif',
  'https://media.giphy.com/media/ZQN9jsRGp1692/giphy.gif',
];

module.exports = {
  name: 'hug',
  description: 'Give someone a hug',
  aliases: ['cuddle'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('hug')
      .setDescription('Give someone a hug')
      .addUserOption(o => o.setName('user').setDescription('Who to hug').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply    = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const target   = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const sender   = source.user ?? source.author;
    const gif      = GIFS[Math.floor(Math.random() * GIFS.length)];

    if (!target) return reply({ content: 'Who do you want to hug?', ephemeral: true });
    if (target.id === sender.id) return reply({ content: '🤗 Hugging yourself? That\'s wholesome!', ephemeral: true });

    await reply({
      embeds: [base(client)
        .setColor('#FF85E1')
        .setDescription(`🤗 **${sender.username}** hugs **${target.username}**!`)
        .setImage(gif)],
    });
  },
};

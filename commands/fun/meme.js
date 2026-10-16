const { SlashCommandBuilder } = require('discord.js');
const { base, error } = require('../../utils/embed');

module.exports = {
  name: 'meme',
  description: 'Get a random meme',
  aliases: ['randommeme'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('meme').setDescription('Get a random meme') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    try {
      const res  = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data?.url) throw new Error('No meme returned');

      const embed = base(client)
        .setTitle(data.title?.substring(0, 256) ?? 'Random Meme')
        .setImage(data.url)
        .addFields(
          { name: '👍', value: `${data.ups ?? 0}`, inline: true },
          { name: '📌 Subreddit', value: `r/${data.subreddit ?? 'memes'}`, inline: true }
        );

      await reply({ embeds: [embed] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', 'Could not fetch a meme. Try again.')], ephemeral: true });
    }
  },
};

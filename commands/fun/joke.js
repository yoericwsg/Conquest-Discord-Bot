const { SlashCommandBuilder } = require('discord.js');
const { panel, error } = require('../../utils/embed');

module.exports = {
  name: 'joke',
  description: 'Get a random joke',
  aliases: ['jk'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('joke').setDescription('Get a random joke') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    try {
      const res  = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await res.json();

      await reply({
        embeds: [panel(client, '😂  Random Joke', [
          `**Setup:** ${data.setup}`,
          ``,
          `||**Punchline:** ${data.punchline}||`,
        ], '#FEE75C')],
      });
    } catch {
      await reply({ embeds: [error(client, 'Failed', 'Could not fetch a joke. Try again.')], ephemeral: true });
    }
  },
};

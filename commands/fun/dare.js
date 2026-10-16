const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

const DARES = [
  'Send a voice message saying "I am a banana" in your best opera voice.',
  'Change your nickname to something your friends choose for the next 10 minutes.',
  'DM the last person you talked to and say "I know what you did."',
  'Type in this chat with your eyes closed for the next 60 seconds.',
  'Send your most recent photo to the chat.',
  'Speak in a different accent for the next 5 minutes.',
  'Write a short poem about the last person who messaged in this chat.',
  'Send a GIF that describes your current mood.',
  'React to the last 5 messages in this chat with random emojis.',
  'Change your avatar to something a random friend chooses for 1 hour.',
  'Describe the last dream you had in one sentence.',
  'Type out the alphabet backwards as fast as you can.',
  'Make up a three-line rap about this server.',
  'Send "I love pickles" in 5 different languages.',
  'Describe your personality using only 3 emojis.',
];

module.exports = {
  name: 'dare',
  description: 'Get a dare for truth or dare',
  aliases: ['d'],
  cooldown: 3,
  slash: { data: new SlashCommandBuilder().setName('dare').setDescription('Get a random dare challenge') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const d = DARES[Math.floor(Math.random() * DARES.length)];
    await reply({ embeds: [panel(client, '😈  Dare', [d], '#ED4245')] });
  },
};

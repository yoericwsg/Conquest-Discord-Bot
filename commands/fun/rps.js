const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJIS  = { rock: '🪨', paper: '📄', scissors: '✂️' };
const BEATS   = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

module.exports = {
  name: 'rps',
  description: 'Play Rock Paper Scissors against the bot',
  aliases: ['rockpaperscissors'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('rps')
      .setDescription('Play Rock Paper Scissors against the bot')
      .addStringOption(o => o.setName('choice').setDescription('Your pick').setRequired(true)
        .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply    = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const player   = (isSlash ? source.options.getString('choice') : args[0]?.toLowerCase()) ?? 'rock';
    const bot      = CHOICES[Math.floor(Math.random() * 3)];

    if (!CHOICES.includes(player))
      return reply({ content: `❌ Choose: \`rock\`, \`paper\`, or \`scissors\`.`, ephemeral: true });

    const winner = player === bot ? 'tie' : BEATS[player] === bot ? 'player' : 'bot';
    const color  = winner === 'tie' ? '#FEE75C' : winner === 'player' ? '#57F287' : '#ED4245';
    const result = winner === 'tie' ? "🤝 It's a tie!" : winner === 'player' ? '🎉 You win!' : '🤖 Bot wins!';

    await reply({
      embeds: [panel(client, '✊  Rock Paper Scissors', [
        `${EMOJIS[player]}  **You:**  ${player}`,
        `${EMOJIS[bot]}  **Bot:**  ${bot}`,
        ``,
        `**${result}**`,
      ], color)],
    });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'choose',
  description: 'Choose between options',
  aliases: ['pick', 'decide'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('choose')
      .setDescription('Let the bot pick between options')
      .addStringOption(o => o.setName('options').setDescription('Comma-separated options').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const raw     = isSlash ? source.options.getString('options') : args.join(' ');
    const choices = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (choices.length < 2) return reply({ content: 'Provide at least 2 comma-separated options.', ephemeral: true });
    const pick = choices[Math.floor(Math.random() * choices.length)];
    await reply({
      embeds: [panel(client, '🤔  Decision', [
        `Options: ${choices.map(c => `\`${c}\``).join(' · ')}`,
        ``,
        `I choose → **${pick}**`,
      ])],
    });
  },
};

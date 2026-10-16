const { SlashCommandBuilder } = require('discord.js');
const { panel, progressBar } = require('../../utils/embed');

module.exports = {
  name: 'howgay',
  description: 'Fun percentage command',
  aliases: ['gay'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('howgay')
      .setDescription('Totally accurate fun percentage meter')
      .addUserOption(o => o.setName('user').setDescription('User to check (default: you)')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const user    = isSlash ? (source.options.getUser('user') ?? source.user) : (source.mentions.users.first() ?? source.author);
    const pct     = Math.floor(Math.random() * 101);
    const label   = pct > 80 ? '🌈 Off the charts!' : pct > 50 ? '🌈 Pretty gay!' : pct > 20 ? '🏳️ A little gay.' : '😐 Not very gay.';
    await reply({
      embeds: [panel(client, '🏳️‍🌈  Gay Meter', [
        `**${user.username}** is:`,
        `${progressBar(pct, 100)} **${pct}%**`,
        ``,
        `*${label}*`,
      ])],
    });
  },
};

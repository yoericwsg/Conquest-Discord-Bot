const { SlashCommandBuilder } = require('discord.js');
const { panel, progressBar } = require('../../utils/embed');
const economy = require('../../systems/economy');
const cfg = require('../../config.json');

module.exports = {
  name: 'balance',
  description: 'Check your or another user\'s balance',
  aliases: ['bal', 'money', 'wallet'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your balance')
      .addUserOption(o => o.setName('user').setDescription('User to check')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const user   = isSlash ? (source.options.getUser('user') ?? source.user)
      : (source.mentions.users.first() ?? source.author);
    const data   = economy.getUser(user.id);
    const bal    = data.balance ?? 0;

    const lb       = economy.getLeaderboard(100);
    const rank     = lb.findIndex(([id]) => id === user.id) + 1;
    const maxBal   = lb[0]?.[1]?.balance ?? bal;
    const bar      = progressBar(bal, Math.max(maxBal, 1));

    await reply({
      embeds: [panel(client, `${cfg.economy.currency}  Balance — ${user.username}`, [
        `💰  **Balance:**   \`${bal.toLocaleString()}\` coins`,
        `🏆  **Rank:**      #${rank > 0 ? rank : '—'}`,
        ``,
        `📊  **Wealth:**    ${bar}`,
        ``,
        `🎒  **Inventory:** ${data.inventory?.join(', ') || 'Empty'}`,
      ])],
    });
  },
};

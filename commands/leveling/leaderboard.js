const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');
const leveling = require('../../systems/leveling');

module.exports = {
  name: 'leaderboard',
  description: 'View the XP leaderboard',
  aliases: ['lb', 'top'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder().setName('leaderboard').setDescription('View the XP leaderboard') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const top   = leveling.getLeaderboard(10);
    const medals = ['🥇', '🥈', '🥉'];

    if (!top.length) return reply({ content: 'No leveling data yet.', ephemeral: true });

    const lines = await Promise.all(top.map(async ([userId, data], i) => {
      let name = userId;
      try { const u = await client.users.fetch(userId); name = u.username; } catch {}
      const medal = medals[i] ?? `**#${i + 1}**`;
      return `${medal}  **${name}** — Level ${data.level ?? 0} · ${(data.xp ?? 0).toLocaleString()} XP`;
    }));

    await reply({ embeds: [panel(client, '🏆  XP Leaderboard', lines)] });
  },
};

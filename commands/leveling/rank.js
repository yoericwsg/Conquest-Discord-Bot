const { SlashCommandBuilder } = require('discord.js');
const { panel, progressBar } = require('../../utils/embed');
const leveling = require('../../systems/leveling');
const storage  = require('../../utils/storage');

module.exports = {
  name: 'rank',
  description: 'View your level and XP',
  aliases: ['level', 'xp', 'exp'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('rank')
      .setDescription('View your rank and XP')
      .addUserOption(o => o.setName('user').setDescription('User to check')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const user = isSlash ? (source.options.getUser('user') ?? source.user)
      : (source.mentions.users.first() ?? source.author);

    const data    = storage.get('leveling.json', user.id, { xp: 0, level: 0 });
    const level   = data.level ?? 0;
    const xp      = data.xp ?? 0;
    const needed  = leveling.xpForLevel(level + 1);
    const { rank, total } = leveling.getRank(user.id);

    await reply({
      embeds: [panel(client, `⭐  Rank — ${user.username}`, [
        `🏆  **Rank:**    #${rank} of ${total}`,
        `📊  **Level:**   ${level}`,
        `✨  **XP:**      ${xp.toLocaleString()} / ${needed.toLocaleString()}`,
        ``,
        `${progressBar(xp, needed)} to Level ${level + 1}`,
      ])],
    });
  },
};

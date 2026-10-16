const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { panel } = require('../../utils/embed');
const cfg = require('../../config.json');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

module.exports = {
  name: 'botinfo',
  description: 'Display information about Conquest',
  aliases: ['about', 'bi'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder().setName('botinfo').setDescription('Display information about Conquest') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    await reply({
      embeds: [
        panel(client, `🤖  Conquest ${cfg.version}`, [
          `📛  **Name:**         ${client.user.tag}`,
          `🏷️  **Version:**      ${cfg.version}`,
          `🛠️  **discord.js:**   v${djsVersion}`,
          `🟩  **Node.js:**      ${process.version}`,
          ``,
          `⏱️  **Uptime:**       \`${formatUptime(client.uptime ?? 0)}\``,
          `⚙️  **Memory:**       \`${memMB} MB\``,
          `🏓  **Ping:**         \`${Math.round(client.ws.ping)}ms\``,
          ``,
          `🌐  **Servers:**      \`${client.guilds.cache.size}\``,
          `👥  **Users:**        \`${client.users.cache.size}\``,
          `📋  **Commands:**     \`${client.commands.size + client.prefixCommands.size}\``,
        ]).setThumbnail(client.user.displayAvatarURL({ size: 256 })),
      ],
    });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');
const os = require('os');

function cpuUsage() {
  const cpus = os.cpus();
  const avg = os.loadavg()[0];
  const cores = cpus.length;
  const pct = Math.min((avg / cores) * 100, 100).toFixed(1);
  return pct;
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

module.exports = {
  name: 'runservers',
  description: 'View detailed bot status and server metrics',
  aliases: ['status', 'stats'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder().setName('runservers').setDescription('View detailed bot status and server metrics') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const ws      = Math.round(client.ws.ping);
    const upMs    = client.uptime ?? 0;
    const memMB   = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const totalMB = (os.totalmem() / 1024 / 1024).toFixed(0);
    const cpu     = cpuUsage();
    const users   = client.users.cache.size;
    const servers = client.guilds.cache.size;

    const pingStatus   = ws < 120 ? '🟢 ONLINE'  : ws < 250 ? '🟡 WARNING' : '🔴 DOWN';
    const color        = ws < 120 ? '#57F287'     : ws < 250 ? '#FEE75C'    : '#ED4245';
    const uptimeHours  = upMs / 3_600_000;
    const stability    = uptimeHours > 24 ? '🟢 Stable' : uptimeHours > 6 ? '🟡 Moderate' : '🔴 Unstable';

    const lines = [
      `📊  **Status:**       ${pingStatus}`,
      `🏓  **Ping:**         \`${ws}ms\``,
      `⏱️  **Uptime:**       \`${formatUptime(upMs)}\``,
      `🔁  **Restarts:**     \`${client.restarts ?? 0}\``,
      ``,
      `🌐  **Servers:**      \`${servers}\``,
      `👥  **Cached Users:** \`${users}\``,
      ``,
      `⚙️  **Memory:**       \`${memMB} MB / ${totalMB} MB\``,
      `📈  **CPU Load:**     \`${cpu}%\``,
      `💚  **Stability:**    ${stability}`,
    ];

    await reply({ embeds: [panel(client, '🖥️  unitClan — Server Status', lines, color)] });
  },
};


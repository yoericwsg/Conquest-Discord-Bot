const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

module.exports = {
  name: 'uptime',
  description: 'Show how long the bot has been online',
  aliases: ['up'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('uptime').setDescription('Show how long the bot has been online') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const upMs     = client.uptime ?? 0;
    const hours    = upMs / 3_600_000;
    const stability = hours > 24 ? '🟢 Stable' : hours > 6 ? '🟡 Moderate' : '🔴 Unstable';
    const started  = Math.floor((Date.now() - upMs) / 1000);

    await reply({
      embeds: [panel(client, '⏱️  Uptime', [
        `🕐  **Uptime:**     \`${formatUptime(upMs)}\``,
        `📅  **Started:**    <t:${started}:F>`,
        `💚  **Stability:**  ${stability}`,
        `🔁  **Restarts:**   \`${client.restarts ?? 0}\``,
      ])],
    });
  },
};

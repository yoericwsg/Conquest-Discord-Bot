const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'ping',
  description: 'Check the bot latency',
  aliases: ['pong'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const ws = Math.round(client.ws.ping);
    const color = ws < 120 ? '#57F287' : ws < 250 ? '#FEE75C' : '#ED4245';
    const status = ws < 120 ? '🟢 Excellent' : ws < 250 ? '🟡 Good' : '🔴 High';

    const sent = isSlash
      ? await source.reply({ content: '...', fetchReply: true })
      : await source.channel.send('...');

    const roundtrip = sent.createdTimestamp - source.createdTimestamp;
    const embed = panel(client, '🏓  Pong!', [
      `🏓  **Roundtrip:** \`${roundtrip}ms\``,
      `📡  **Websocket:** \`${ws}ms\` ${status}`,
      `⏱️  **Uptime:** <t:${Math.floor((Date.now() - (client.uptime ?? 0)) / 1000)}:R>`,
    ], color);

    isSlash ? source.editReply({ content: '', embeds: [embed] }) : sent.edit({ content: '', embeds: [embed] });
  },
};

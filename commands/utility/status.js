const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, version: djsVersion } = require('discord.js');
const { panel } = require('../../utils/embed');
const maintenance = require('../../systems/maintenance');

const MIN_INTERVAL_S = 5;
const MAX_INTERVAL_S = 3600;
const MAX_DURATION_MS = 30 * 60 * 1000; // auto-stop after 30 min so it can't run forever

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

function parseInterval(raw) {
  if (!raw) return null;
  const match = String(raw).trim().match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)?$/i);
  if (!match) return null;
  let n = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  if (unit.startsWith('m')) n *= 60;
  return n;
}

function buildStatusEmbed(client, intervalS) {
  const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const downtime = maintenance.getActiveDowntime();
  const lines = [
    `${downtime ? '🔴' : '🟢'}  **Status:**       ${downtime ? `Down · ${downtime.reason}` : 'Online'}`,
    `🏓  **Ping:**         \`${Math.round(client.ws.ping)}ms\``,
    `⏱️  **Uptime:**       \`${formatUptime(client.uptime ?? 0)}\``,
    `⚙️  **Memory:**       \`${memMB} MB\``,
    `🛠️  **discord.js:**   v${djsVersion}`,
    `🟩  **Node.js:**      ${process.version}`,
    ``,
    `🌐  **Servers:**      \`${client.guilds.cache.size}\``,
    `👥  **Users:**        \`${client.users.cache.size}\``,
    `📋  **Commands:**     \`${client.prefixCommands.size} prefix · ${client.commands.size} slash\``,
  ];
  if (intervalS) lines.push(``, `🔁  **Auto-refresh:**  every \`${intervalS}s\` · <t:${Math.floor(Date.now() / 1000)}:R>`);
  const embed = panel(client, '📊  Bot Status', lines).setThumbnail(client.user.displayAvatarURL({ size: 256 }));
  if (downtime) embed.setColor('#ED4245');
  return embed;
}

function buildStopRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('status_stop')
      .setLabel('Stop Refreshing')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

module.exports = {
  name: 'status',
  description: 'Show bot status, optionally auto-refreshing on an interval',
  aliases: ['stat'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('status')
      .setDescription('Show bot status, optionally auto-refreshing on an interval')
      .addIntegerOption(o => o.setName('interval').setDescription('Refresh interval in seconds (5-3600)').setMinValue(MIN_INTERVAL_S).setMaxValue(MAX_INTERVAL_S)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();

    let intervalS = isSlash ? source.options.getInteger('interval') : parseInterval(args[0]);
    if (intervalS !== null && intervalS !== undefined) {
      if (isNaN(intervalS) || intervalS < MIN_INTERVAL_S || intervalS > MAX_INTERVAL_S) {
        const msg = { content: `⚠️ Interval must be between ${MIN_INTERVAL_S}s and ${MAX_INTERVAL_S}s (e.g. \`?status 30s\` or \`?status 5m\`).` };
        return isSlash ? source.reply({ ...msg, flags: MessageFlags.Ephemeral }) : source.channel.send(msg);
      }
    } else {
      intervalS = null;
    }

    const embed = buildStatusEmbed(client, intervalS);
    const payload = intervalS ? { embeds: [embed], components: [buildStopRow()] } : { embeds: [embed] };

    const sent = isSlash ? await source.reply({ ...payload, fetchReply: true }) : await source.channel.send(payload);
    if (!intervalS) return;

    const startedAt = Date.now();
    let stopped = false;

    const stopRefresh = async (finalNote) => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      const finalEmbed = buildStatusEmbed(client, null);
      if (finalNote) finalEmbed.setFooter({ text: finalNote });
      await sent.edit({ embeds: [finalEmbed], components: [buildStopRow(true)] }).catch(() => null);
    };

    const timer = setInterval(async () => {
      if (Date.now() - startedAt >= MAX_DURATION_MS) {
        return stopRefresh('Auto-refresh stopped after 30 minutes');
      }
      await sent.edit({ embeds: [buildStatusEmbed(client, intervalS)], components: [buildStopRow()] }).catch(() => stopRefresh());
    }, intervalS * 1000);

    const collector = sent.createMessageComponentCollector({ time: MAX_DURATION_MS });
    collector.on('collect', async (i) => {
      if (i.customId !== 'status_stop') return;
      const requesterId = isSlash ? source.user.id : source.author.id;
      if (i.user.id !== requesterId) return i.reply({ content: "This isn't your status panel.", flags: MessageFlags.Ephemeral });
      await i.deferUpdate().catch(() => null);
      await stopRefresh('Stopped manually');
      collector.stop();
    });
    collector.on('end', () => stopRefresh());
  },
};

const { EmbedBuilder } = require('discord.js');
const { AsyncLocalStorage } = require('node:async_hooks');
const cfg = require('../config.json');
const guildContext = new AsyncLocalStorage();

const SEP = '━━━━━━━━━━━━━━━━━━━━━━';
const FOOTER = `${cfg.brandName ?? 'unitClan'} ${cfg.version}`;
const COLORS = {
  purple: '#9B59B6', blue: '#5865F2', green: '#57F287', red: '#ED4245',
  yellow: '#FEE75C', pink: '#EB459E',
};

const TITLE_EMOJIS = new Map([
  ['✅', ['cq_ok', '✅']], ['❌', ['cq_error', '❌']], ['⚠️', ['cq_warn', '⚠️']],
  ['ℹ️', ['cq_info', 'ℹ️']], ['🛡️', ['cq_shield', '🛡️']], ['⭐', ['cq_star', '⭐']],
]);

function withGuildContext(guild, callback) {
  return guildContext.run(guild ?? null, callback);
}

function resolveEmoji(name, fallback, guild = guildContext.getStore()) {
  const emoji = guild?.emojis?.cache?.find(entry => entry.name === name);
  return emoji ? emoji.toString() : fallback;
}

function styleTitle(title) {
  if (typeof title !== 'string') return title;
  for (const [unicode, [name, fallback]] of TITLE_EMOJIS) {
    if (title.startsWith(unicode)) return `${resolveEmoji(name, fallback)}${title.slice(unicode.length)}`;
  }
  return title;
}

function base(client) {
  return new EmbedBuilder()
    .setColor(cfg.embedColor)
    .setFooter({ text: FOOTER, iconURL: client?.user?.displayAvatarURL() })
    .setTimestamp();
}

function withImage(embed, imageUrl) {
  if (typeof imageUrl === 'string' && imageUrl.length <= 2048 && /^https:\/\/\S+$/i.test(imageUrl)) {
    embed.setImage(imageUrl);
  }
  return embed;
}

function success(client, title, description, imageUrl) {
  return withImage(base(client)
    .setColor(cfg.successColor)
    .setTitle(`${resolveEmoji('cq_ok', '✅')}  ${title}`)
    .setDescription(`${SEP}\n${description}\n${SEP}`), imageUrl);
}

function error(client, title, description, imageUrl) {
  return withImage(base(client)
    .setColor(cfg.errorColor)
    .setTitle(`${resolveEmoji('cq_error', '❌')}  ${title}`)
    .setDescription(`${SEP}\n${description}\n${SEP}`), imageUrl);
}

function warning(client, title, description) {
  return base(client)
    .setColor(cfg.warningColor)
    .setTitle(`${resolveEmoji('cq_warn', '⚠️')}  ${title}`)
    .setDescription(`${SEP}\n${description}\n${SEP}`);
}

function panel(client, title, lines = [], color = null, imageUrl) {
  const desc = Array.isArray(lines) ? `${SEP}\n${lines.join('\n')}\n${SEP}` : `${SEP}\n${lines}\n${SEP}`;
  return withImage(base(client)
    .setColor(color ?? cfg.embedColor)
    .setTitle(styleTitle(title))
    .setDescription(desc), imageUrl);
}

function info(client, title, fields = [], description = null) {
  const embed = base(client).setTitle(styleTitle(title)).setColor(cfg.embedColor);
  if (description) embed.setDescription(`${SEP}\n${description}\n${SEP}`);
  if (fields.length) embed.addFields(fields);
  return embed;
}

function profile(client, title, fields = [], description = null, thumbnail = null, color = COLORS.purple) {
  const embed = base(client).setTitle(styleTitle(title)).setColor(color);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  return embed;
}

function moderation(client, title, target, moderator, reason, color = COLORS.red) {
  return base(client).setColor(color).setTitle(styleTitle(title)).addFields(
    { name: 'User', value: String(target).slice(0, 1024), inline: true },
    { name: 'Moderator', value: String(moderator).slice(0, 1024), inline: true },
    { name: 'Reason', value: String(reason || 'No reason provided').slice(0, 1024) },
  );
}

function progressBar(current, max, length = 12) {
  const pct = Math.min(current / max, 1);
  const filled = Math.round(pct * length);
  const empty = length - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${Math.round(pct * 100)}%`;
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}

module.exports = { base, success, error, warning, panel, info, profile, moderation, COLORS, withImage, progressBar, formatUptime, withGuildContext, resolveEmoji, styleTitle, SEP, FOOTER };

const storage  = require('../utils/storage');
const cfg      = require('../config.json');
const { panel, progressBar } = require('../utils/embed');

const cooldowns = new Map(); // userId -> last xp timestamp

function xpForLevel(level) {
  return 100 * level + 50 * Math.pow(level, 2);
}

function handleMessage(message, client) {
  if (message.author.bot) return;
  const userId = message.author.id;
  const now    = Date.now();

  const last = cooldowns.get(userId) ?? 0;
  if (now - last < cfg.leveling.xpCooldown * 1000) return;
  cooldowns.set(userId, now);

  const xpGain = cfg.leveling.xpPerMessage + Math.floor(Math.random() * cfg.leveling.xpVariance);

  storage.update('leveling.json', userId, data => {
    const newXp    = (data.xp ?? 0) + xpGain;
    const level    = data.level ?? 0;
    const needed   = xpForLevel(level + 1);

    if (newXp >= needed) {
      const newLevel = level + 1;
      notifyLevelUp(message, client, newLevel);
      return { xp: newXp - needed, level: newLevel };
    }
    return { xp: newXp, level };
  }, { xp: 0, level: 0 });
}

async function notifyLevelUp(message, client, level) {
  const embed = panel(
    client,
    '⬆️  Level Up!',
    [`${message.author} has reached **Level ${level}**!`, ``, `${progressBar(level, level + 5)} LVL ${level}`],
    '#57F287'
  );
  message.channel.send({ embeds: [embed] }).catch(() => null);
}

function getRank(userId) {
  const all = storage.read('leveling.json');
  const sorted = Object.entries(all).sort(([, a], [, b]) => {
    const totalA = xpForLevel(a.level ?? 0) + (a.xp ?? 0);
    const totalB = xpForLevel(b.level ?? 0) + (b.xp ?? 0);
    return totalB - totalA;
  });
  const pos = sorted.findIndex(([id]) => id === userId) + 1;
  return { rank: pos, total: sorted.length };
}

function getLeaderboard(limit = 10) {
  const all = storage.read('leveling.json');
  return Object.entries(all)
    .sort(([, a], [, b]) => {
      const totalA = xpForLevel(a.level ?? 0) + (a.xp ?? 0);
      const totalB = xpForLevel(b.level ?? 0) + (b.xp ?? 0);
      return totalB - totalA;
    })
    .slice(0, limit);
}

module.exports = { handleMessage, getRank, getLeaderboard, xpForLevel };

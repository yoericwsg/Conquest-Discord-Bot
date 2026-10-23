const { ActivityType } = require('discord.js');
const storage = require('../utils/storage');
const { base } = require('../utils/embed');

const FILE = 'global-state.json';
const KEY = 'state';
const MAX_DOWNTIME_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const MAX_TIMER_MS = 2_147_000_000;
const UNITS = {
  s: 1_000, sec: 1_000, secs: 1_000, second: 1_000, seconds: 1_000,
  m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
  d: 86_400_000, day: 86_400_000, days: 86_400_000,
  w: 604_800_000, wk: 604_800_000, wks: 604_800_000, week: 604_800_000, weeks: 604_800_000,
  mo: 2_592_000_000, mos: 2_592_000_000, month: 2_592_000_000, months: 2_592_000_000,
  y: 31_536_000_000, yr: 31_536_000_000, yrs: 31_536_000_000, year: 31_536_000_000, years: 31_536_000_000,
};
const DURATION_TOKEN = /(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?|years?|yrs?|y)/iy;

function parseDuration(value) {
  const input = String(value ?? '').trim();
  if (!input) return null;
  let position = 0;
  let total = 0;
  let found = false;

  while (position < input.length) {
    while (/[\s,]/.test(input[position] ?? '')) position++;
    if (position >= input.length) break;
    DURATION_TOKEN.lastIndex = position;
    const match = DURATION_TOKEN.exec(input);
    if (!match) return null;
    const multiplier = UNITS[match[2].toLowerCase()];
    if (!multiplier) return null;
    total += Number(match[1]) * multiplier;
    if (!Number.isFinite(total) || total > MAX_DOWNTIME_MS) return null;
    position = DURATION_TOKEN.lastIndex;
    found = true;
  }

  return found && total >= 1_000 ? Math.floor(total) : null;
}

function readState() {
  const state = storage.get(FILE, KEY, {});
  const downtime = state.downtime && Number.isFinite(state.downtime.endAt) ? state.downtime : null;
  return {
    ...state,
    downtime,
    downtimeBy: typeof state.downtimeBy === 'string' ? state.downtimeBy : null,
  };
}

function writeState(patch) {
  const next = { ...readState(), ...patch };
  storage.set(FILE, KEY, next);
  return next;
}

function getActiveDowntime(now = Date.now()) {
  const downtime = readState().downtime;
  return downtime && downtime.endAt > now ? downtime : null;
}

function setDowntime(downtime) {
  return writeState({ downtime }).downtime;
}

function clearDowntime() {
  const previous = readState().downtime;
  writeState({ downtime: null });
  return previous;
}

function expireDowntime(now = Date.now()) {
  const downtime = readState().downtime;
  if (!downtime || downtime.endAt > now) return null;
  writeState({ downtime: null });
  return downtime;
}

function setDowntimeBy(label) {
  return writeState({ downtimeBy: label }).downtimeBy;
}

async function setApplicationDescriptionForDowntime(client, downtime) {
  try {
    const application = await client.application.fetch();
    const state = readState();
    const originalDescription = typeof state.originalDescription === 'string'
      ? state.originalDescription
      : String(application.description ?? '');
    if (typeof state.originalDescription !== 'string') writeState({ originalDescription });
    const description = `🚧 TEMPORARILY DOWN — ${downtime.reason}${originalDescription ? `\n\n${originalDescription}` : ''}`.slice(0, 4000);
    await application.edit({ description });
    return true;
  } catch (error) {
    console.warn(`[MAINTENANCE] Could not update the application description: ${error.message}`);
    return false;
  }
}

async function restoreApplicationDescription(client) {
  const state = readState();
  if (typeof state.originalDescription !== 'string') return true;
  try {
    const application = await client.application.fetch();
    await application.edit({ description: state.originalDescription });
    writeState({ originalDescription: null });
    return true;
  } catch (error) {
    console.warn(`[MAINTENANCE] Could not restore the application description: ${error.message}`);
    return false;
  }
}

function formatDowntimeEmbed(client, downtime, title = 'unitClan is temporarily down') {
  const end = Math.floor(downtime.endAt / 1000);
  return base(client)
    .setColor('#FEE75C')
    .setTitle(`🛠️  ${title}`)
    .setDescription(
      `**Reason:** ${downtime.reason}\n` +
      `**Expected back:** <t:${end}:R> (<t:${end}:F>)`,
    )
    .addFields(
      { name: 'Started by', value: `${downtime.rankLabel || 'Owner/team'} · ${downtime.startedByTag}`, inline: true },
      { name: 'Status', value: 'AI replies and bot commands are paused during this window.', inline: true },
    );
}

function stopExpiryTimer(client) {
  if (client?.__conquestDowntimeTimer) clearTimeout(client.__conquestDowntimeTimer);
  if (client) client.__conquestDowntimeTimer = null;
}

function syncPresence(client) {
  if (!client?.user) return;
  const downtime = getActiveDowntime();
  if (downtime) {
    client.user.setPresence({
      activities: [{ name: `DOWN · ${downtime.reason}`.slice(0, 100), type: ActivityType.Watching }],
      status: 'dnd',
    });
    return;
  }
  if (typeof client.__conquestRotatePresence === 'function') client.__conquestRotatePresence();
  else client.user.setPresence({ activities: [], status: 'online' });
}

function scheduleDowntimeExpiry(client, onExpire) {
  stopExpiryTimer(client);
  const active = getActiveDowntime();
  if (!active) {
    const expired = expireDowntime();
    if (expired && onExpire) {
      Promise.resolve(onExpire(expired)).catch(error => console.error('[MAINTENANCE] Expiry handler failed:', error.message));
    }
    return;
  }

  const tick = async () => {
    const current = getActiveDowntime();
    if (!current) {
      const expired = expireDowntime();
      syncPresence(client);
      if (expired) await onExpire?.(expired);
      return;
    }
    const remaining = current.endAt - Date.now();
    client.__conquestDowntimeTimer = setTimeout(() => tick().catch(error => console.error('[MAINTENANCE] Expiry handler failed:', error.message)), Math.min(remaining, MAX_TIMER_MS));
    client.__conquestDowntimeTimer.unref?.();
  };

  client.__conquestDowntimeTimer = setTimeout(() => tick().catch(error => console.error('[MAINTENANCE] Expiry handler failed:', error.message)), Math.min(active.endAt - Date.now(), MAX_TIMER_MS));
  client.__conquestDowntimeTimer.unref?.();
}

module.exports = {
  MAX_DOWNTIME_MS,
  parseDuration,
  readState,
  getActiveDowntime,
  setDowntime,
  clearDowntime,
  expireDowntime,
  setDowntimeBy,
  formatDowntimeEmbed,
  setApplicationDescriptionForDowntime,
  restoreApplicationDescription,
  syncPresence,
  scheduleDowntimeExpiry,
  stopExpiryTimer,
};

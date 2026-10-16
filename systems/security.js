const { PermissionFlagsBits, VerificationLevel } = require('discord.js');
const storage = require('../utils/storage');
const { getPrefix } = require('../utils/prefix');
const { warning } = require('../utils/embed');

const STATE_FILE = 'global-state.json';
const STATE_KEY = 'state';
const VERIFICATION_FILE = 'anti-raid-verification.json';
const joinTracker = new Map();
const channelDeletes = new Map();
const roleDeletes = new Map();
const spamTracker = new Map();
const raidAlerts = new Map();
const verificationRestoreTimers = new Map();
const VERIFICATION_DURATION_MS = 10 * 60_000;
const ALERT_COOLDOWN_MS = 60_000;

const MODES = {
  off: null,
  low: { count: 10, windowMs: 10_000 },
  medium: { count: 5, windowMs: 5_000 },
  high: { count: 3, windowMs: 5_000 },
};

const spamTrackerCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of spamTracker) {
    const latest = timestamps[timestamps.length - 1] ?? 0;
    if (now - latest > 30_000) spamTracker.delete(key);
  }
}, 60_000);
spamTrackerCleanup.unref?.();

function getAntiRaidMode() {
  const state = storage.get(STATE_FILE, STATE_KEY, {});
  return Object.prototype.hasOwnProperty.call(MODES, state.antiRaidMode) ? state.antiRaidMode : 'medium';
}

function setAntiRaidMode(mode) {
  if (!(mode in MODES)) throw new Error('Mode must be off, low, medium, or high.');
  storage.update(STATE_FILE, STATE_KEY, state => ({ ...state, antiRaidMode: mode }));
  return mode;
}

async function raiseVerificationTemporarily(guild, client) {
  const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
  if (!botMember?.permissions?.has(PermissionFlagsBits.ManageGuild)) return false;
  if (guild.verificationLevel === VerificationLevel.VeryHigh) return false;

  const record = { previousLevel: guild.verificationLevel, restoreAt: Date.now() + VERIFICATION_DURATION_MS };
  try {
    await guild.setVerificationLevel(VerificationLevel.VeryHigh, 'Temporary high anti-raid response');
    storage.set(VERIFICATION_FILE, guild.id, record);
    scheduleVerificationRestore(guild, record);
    return true;
  } catch (error) {
    console.error(`[ANTI-RAID] Could not raise verification in ${guild.id}: ${error.message}`);
    return false;
  }
}

function scheduleVerificationRestore(guild, record, delayOverride = null) {
  const previousTimer = verificationRestoreTimers.get(guild.id);
  if (previousTimer) clearTimeout(previousTimer);
  const delay = delayOverride ?? Math.max(0, record.restoreAt - Date.now());
  const timer = setTimeout(async () => {
    verificationRestoreTimers.delete(guild.id);
    const latest = storage.get(VERIFICATION_FILE, guild.id, null);
    if (!latest || latest.restoreAt !== record.restoreAt) return;
    try {
      // If a moderator changed verification manually, respect that newer setting.
      if (guild.verificationLevel === VerificationLevel.VeryHigh) {
        await guild.setVerificationLevel(latest.previousLevel, 'Anti-raid temporary verification expired');
      }
      storage.set(VERIFICATION_FILE, guild.id, null);
    } catch (error) {
      console.error(`[ANTI-RAID] Could not restore verification in ${guild.id}: ${error.message}`);
      // Keep the recovery record and retry instead of leaving a guild at Very High forever.
      scheduleVerificationRestore(guild, latest, 30_000);
    }
  }, delay);
  timer.unref?.();
  verificationRestoreTimers.set(guild.id, timer);
}

function recoverVerification(client) {
  for (const guild of client.guilds.cache.values()) {
    const record = storage.get(VERIFICATION_FILE, guild.id, null);
    if (!record || typeof record.restoreAt !== 'number') continue;
    if (record.restoreAt <= Date.now()) {
      scheduleVerificationRestore(guild, record);
    } else scheduleVerificationRestore(guild, record);
  }
}

async function postRaidAlert(guild, client, mode, details, options = {}) {
  const lastAlert = raidAlerts.get(guild.id) ?? 0;
  if (Date.now() - lastAlert < ALERT_COOLDOWN_MS) return;
  raidAlerts.set(guild.id, Date.now());

  const verificationRaised = options.raiseVerification
    ? await raiseVerificationTemporarily(guild, client)
    : false;
  const configs = storage.get('configs.json', guild.id, {});
  const logChannel = configs.logChannel
    ? guild.channels.cache.get(configs.logChannel) ?? await guild.channels.fetch(configs.logChannel).catch(() => null)
    : guild.systemChannel;
  const extra = verificationRaised
    ? '\nVerification was raised temporarily for 10 minutes. No members were kicked or banned.'
    : '\nNo automatic kicks, bans, or channel changes were made.';
  if (logChannel?.isTextBased?.() && typeof logChannel.send === 'function') {
    await logChannel.send({
      embeds: [warning(client, `🛡️ Anti-raid alert · ${mode}`, `${details}${extra}`)],
      allowedMentions: { parse: [] },
    }).catch(() => null);
  }
  console.warn(`[ANTI-RAID] ${guild.name}: ${details}`);
}

function onMemberJoin(member, client) {
  const mode = getAntiRaidMode();
  const threshold = MODES[mode];
  if (!threshold || !member.guild) return;

  const guildId = member.guild.id;
  const now = Date.now();
  const joins = (joinTracker.get(guildId) ?? []).filter(timestamp => now - timestamp < threshold.windowMs);
  joins.push(now);
  joinTracker.set(guildId, joins);
  if (joins.length >= threshold.count) {
    joinTracker.set(guildId, []);
    postRaidAlert(member.guild, client, mode,
      `Detected **${joins.length} joins in ${Math.round(threshold.windowMs / 1000)} seconds**.`,
      { raiseVerification: mode === 'high' }).catch(error => console.error(`[ANTI-RAID] ${guildId}: ${error.message}`));
  }
}

function trackDeletes(map, guild, client, type) {
  const now = Date.now();
  const entry = map.get(guild.id) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(timestamp => now - timestamp < 10_000);
  entry.timestamps.push(now);
  map.set(guild.id, entry);
  if (entry.timestamps.length >= 3) {
    const count = entry.timestamps.length;
    entry.timestamps = [];
    postRaidAlert(guild, client, 'monitor', `Detected **${count} ${type} deletions in 10 seconds**.`)
      .catch(error => console.error(`[SECURITY] ${guild.id}: ${error.message}`));
  }
}

function onChannelDelete(channel, client) {
  if (channel.guild) trackDeletes(channelDeletes, channel.guild, client, 'channel');
}

function onRoleDelete(role, client) {
  if (role.guild) trackDeletes(roleDeletes, role.guild, client, 'role');
}

function handleMessage(message, client) {
  if (!message.guild || message.author.bot || !message.member) return;
  if (message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
  if (message.content.startsWith(getPrefix(message.guild.id))) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const recent = (spamTracker.get(key) ?? []).filter(timestamp => now - timestamp < 5_000);
  recent.push(now);
  spamTracker.set(key, recent);
  if (recent.length < 7) return;

  spamTracker.delete(key);
  if (!message.member.moderatable) return;
  message.member.timeout(30_000, 'Conquest anti-spam: 7 messages in 5 seconds')
    .then(() => message.channel.send({
      embeds: [warning(client, 'Anti-spam timeout', `${message.author} was timed out for sending 7 messages in 5 seconds.`)],
      allowedMentions: { parse: [] },
    }))
    .then(notice => setTimeout(() => notice.delete().catch(() => null), 5000))
    .catch(error => console.error(`[ANTI-SPAM] ${message.guild.id}/${message.author.id}: ${error.message}`));
}

module.exports = {
  MODES, getAntiRaidMode, setAntiRaidMode, onMemberJoin, onChannelDelete,
  onRoleDelete, handleMessage, recoverVerification,
};

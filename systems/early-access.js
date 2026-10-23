const storage = require('../utils/storage');

const FILE = 'global-state.json';
const KEY = 'state';
const RELEASE = '4.6.2-early-access';
const SNOWFLAKE = /^\d{17,20}$/;

function readEntries() {
  const state = storage.get(FILE, KEY, {});
  return Array.isArray(state.earlyAccessGuilds) ? state.earlyAccessGuilds : [];
}

function getEarlyAccessGuilds() {
  return readEntries().filter(entry => entry && SNOWFLAKE.test(String(entry.guildId ?? '')));
}

function isEarlyAccessGuild(guildId, release = RELEASE) {
  return getEarlyAccessGuilds().some(entry =>
    entry.guildId === String(guildId) && entry.release === release,
  );
}

function addEarlyAccessGuild(guild, actor) {
  const entries = getEarlyAccessGuilds();
  const existing = entries.find(entry => entry.guildId === guild.id && entry.release === RELEASE);
  if (existing) return { added: false, entry: existing };

  const entry = {
    guildId: guild.id,
    guildName: String(guild.name ?? 'Unknown server').slice(0, 100),
    release: RELEASE,
    addedAt: Date.now(),
    addedBy: actor.id,
    addedByTag: String(actor.tag ?? actor.username ?? 'unitClan team').slice(0, 100),
  };
  storage.update(FILE, KEY, state => ({
    ...state,
    earlyAccessGuilds: [...(Array.isArray(state.earlyAccessGuilds) ? state.earlyAccessGuilds : []), entry],
  }));
  return { added: true, entry };
}

function removeEarlyAccessGuild(guildId) {
  let removed = false;
  storage.update(FILE, KEY, state => {
    const entries = Array.isArray(state.earlyAccessGuilds) ? state.earlyAccessGuilds : [];
    const next = entries.filter(entry => {
      const keep = !(entry?.guildId === String(guildId) && entry?.release === RELEASE);
      if (!keep) removed = true;
      return keep;
    });
    return { ...state, earlyAccessGuilds: next };
  });
  return removed;
}

module.exports = { RELEASE, SNOWFLAKE, getEarlyAccessGuilds, isEarlyAccessGuild, addEarlyAccessGuild, removeEarlyAccessGuild };

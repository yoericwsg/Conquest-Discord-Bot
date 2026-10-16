const storage = require('../utils/storage');

const FILE = 'customcmds.json';

// Storage: { [guildId]: { [cmdName]: { response, description, createdBy, createdAt } } }

function getAll(guildId) {
  return storage.get(FILE, guildId, {});
}

function get(guildId, cmdName) {
  const cmds = getAll(guildId);
  return cmds[cmdName.toLowerCase()] ?? null;
}

function set(guildId, cmdName, data) {
  const cmds = getAll(guildId);
  cmds[cmdName.toLowerCase()] = data;
  storage.set(FILE, guildId, cmds);
}

function remove(guildId, cmdName) {
  const cmds = getAll(guildId);
  delete cmds[cmdName.toLowerCase()];
  storage.set(FILE, guildId, cmds);
}

function count(guildId) {
  return Object.keys(getAll(guildId)).length;
}

module.exports = { getAll, get, set, remove, count };

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'prefixes.json');
const DEFAULT = '?';

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

function getPrefix(guildId) {
  return load()[guildId] ?? DEFAULT;
}

function setPrefix(guildId, prefix) {
  const data = load();
  data[guildId] = prefix;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = { getPrefix, setPrefix, DEFAULT };

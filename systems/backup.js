const fs      = require('fs');
const path    = require('path');
const storage = require('../utils/storage');

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function createBackup(guild) {
  const backup = {
    id: guild.id,
    name: guild.name,
    createdAt: new Date().toISOString(),
    roles: [],
    channels: [],
  };

  // Roles (skip @everyone and managed roles)
  guild.roles.cache
    .filter(r => !r.managed && r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .forEach(role => {
      backup.roles.push({
        name: role.name,
        color: role.hexColor,
        permissions: role.permissions.bitfield.toString(),
        hoist: role.hoist,
        mentionable: role.mentionable,
        position: role.position,
      });
    });

  // Channels
  guild.channels.cache
    .filter(c => !c.parentId || c.type === 4) // categories first
    .forEach(ch => {
      backup.channels.push({
        name: ch.name,
        type: ch.type,
        parentName: ch.parent?.name ?? null,
        position: ch.position,
        topic: ch.topic ?? null,
        nsfw: ch.nsfw ?? false,
        bitrate: ch.bitrate ?? null,
        userLimit: ch.userLimit ?? null,
      });
    });

  const filename = `${guild.id}_${Date.now()}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  return { filename, backup };
}

async function restoreBackup(guild, filename) {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return { success: false, reason: 'Backup file not found.' };

  const backup = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const results = { roles: 0, channels: 0, errors: [] };

  // Recreate roles
  for (const role of backup.roles.reverse()) {
    try {
      await guild.roles.create({
        name: role.name,
        color: role.color,
        permissions: BigInt(role.permissions),
        hoist: role.hoist,
        mentionable: role.mentionable,
        reason: 'unitClan: backup restore',
      });
      results.roles++;
    } catch (e) {
      results.errors.push(`Role "${role.name}": ${e.message}`);
    }
  }

  // Recreate categories first, then channels
  const catMap = {};
  const cats  = backup.channels.filter(c => c.type === 4);
  const chans = backup.channels.filter(c => c.type !== 4);

  for (const cat of cats) {
    try {
      const created = await guild.channels.create({ name: cat.name, type: 4, reason: 'unitClan: backup restore' });
      catMap[cat.name] = created.id;
      results.channels++;
    } catch (e) { results.errors.push(`Category "${cat.name}": ${e.message}`); }
  }

  for (const ch of chans) {
    try {
      const opts = {
        name: ch.name,
        type: ch.type,
        topic: ch.topic,
        nsfw: ch.nsfw,
        reason: 'unitClan: backup restore',
      };
      if (ch.parentName && catMap[ch.parentName]) opts.parent = catMap[ch.parentName];
      await guild.channels.create(opts);
      results.channels++;
    } catch (e) { results.errors.push(`Channel "${ch.name}": ${e.message}`); }
  }

  return { success: true, results };
}

function listBackups(guildId) {
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(guildId) && f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
      return { filename: f, name: data.name, createdAt: data.createdAt, roles: data.roles.length, channels: data.channels.length };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = { createBackup, restoreBackup, listBackups };


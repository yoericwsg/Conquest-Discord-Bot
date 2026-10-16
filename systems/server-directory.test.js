const assert = require('node:assert/strict');
const test = require('node:test');
const {
  parseDiscordInvite,
  validateGuildInvite,
  buildDirectoryEntries,
} = require('./server-directory');

test('Discord invite parser accepts Discord links and rejects unrelated URLs', () => {
  assert.equal(parseDiscordInvite('https://discord.gg/AbC-123'), 'AbC-123');
  assert.equal(parseDiscordInvite('discord.com/invite/xyz?event=123'), 'xyz');
  assert.equal(parseDiscordInvite('https://example.com/invite/xyz'), null);
  assert.equal(parseDiscordInvite('not a link'), null);
});

test('approved invite must belong to the guild that configured it', async () => {
  const client = {
    fetchInvite: async code => ({ code, guild: { id: 'guild-1' } }),
  };
  assert.equal(
    await validateGuildInvite(client, 'guild-1', 'https://discord.gg/abc'),
    'https://discord.gg/abc',
  );
  await assert.rejects(
    validateGuildInvite(client, 'guild-2', 'https://discord.gg/abc'),
    /does not belong to this server/,
  );
});

test('server directory entries include only valid configured invites', () => {
  const guilds = [
    { id: '2', name: 'Zeta', memberCount: 20 },
    { id: '1', name: 'Alpha', memberCount: 10 },
  ];
  const configs = {
    1: { serverInvite: 'https://discord.gg/alpha' },
    2: { serverInvite: 'https://example.com/not-a-discord-invite' },
  };
  const entries = buildDirectoryEntries(guilds, id => configs[id]);
  assert.deepEqual(entries.map(entry => entry.name), ['Alpha', 'Zeta']);
  assert.equal(entries[0].invite, 'https://discord.gg/alpha');
  assert.equal(entries[1].invite, null);
});

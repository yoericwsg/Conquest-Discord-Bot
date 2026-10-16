const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits } = require('discord.js');
const { TEMPLATES, createServerFromTemplate, cleanTextChannelName } = require('./server-builder');

class FakeCollection {
  constructor() {
    this.items = [];
  }

  find(predicate) {
    return this.items.find(predicate);
  }

  values() {
    return this.items.values();
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  add(item) {
    this.items.push(item);
    return item;
  }
}

function createFakeGuild({ allowChannels = true, allowRoles = true } = {}) {
  const channelCache = new FakeCollection();
  const roleCache = new FakeCollection();
  let nextId = 0;

  const guild = {
    channels: {
      cache: channelCache,
      fetch: async () => channelCache,
      create: async options => {
        const channel = channelCache.add({
          id: `channel-${++nextId}`,
          name: options.name,
          type: options.type,
          parentId: options.parent ?? null,
          topic: options.topic,
        });
        return channel;
      },
    },
    roles: {
      cache: roleCache,
      fetch: async () => roleCache,
      create: async options => roleCache.add({
        id: `role-${++nextId}`,
        ...options,
      }),
    },
    members: {
      me: {
        permissions: {
          has(permission) {
            if (permission === PermissionFlagsBits.ManageChannels) return allowChannels;
            if (permission === PermissionFlagsBits.ManageRoles) return allowRoles;
            return false;
          },
        },
      },
    },
  };
  return guild;
}

test('all documented templates have categories and channels', () => {
  for (const template of Object.values(TEMPLATES)) {
    assert.ok(template.categories.length > 0);
    assert.ok(template.categories.every(category => category.channels.length > 0));
    assert.ok(template.roles.length > 0);
  }
});

test('text channel names are normalized for Discord', () => {
  assert.equal(cleanTextChannelName(' Looking For Group! '), 'looking-for-group');
});

test('template building creates items once and is safe to repeat', async () => {
  const guild = createFakeGuild();
  const first = await createServerFromTemplate(guild, 'gaming');

  assert.ok(first.created.length > 10);
  assert.equal(first.failed.length, 0);

  const second = await createServerFromTemplate(guild, 'gaming');
  assert.equal(second.created.length, 0);
  assert.ok(second.skipped.length > 10);
});

test('unknown templates fail with supported choices', async () => {
  await assert.rejects(
    createServerFromTemplate(createFakeGuild(), 'unknown'),
    /community, gaming, study, creator/,
  );
});

test('missing bot permissions stop before creating server items', async () => {
  const guild = createFakeGuild({ allowRoles: false });
  await assert.rejects(createServerFromTemplate(guild, 'community'), /Manage Roles/);
  assert.equal(guild.channels.cache.items.length, 0);
  assert.equal(guild.roles.cache.items.length, 0);
});

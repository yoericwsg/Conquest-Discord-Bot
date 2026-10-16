process.env.OPENROUTER_API_KEY ||= 'unit-test-placeholder';


const assert = require('node:assert/strict');
const test = require('node:test');
const { ChannelType, Collection, PermissionFlagsBits } = require('discord.js');
const { executeTool, getToolsForMode } = require('./openrouter');

function createFakeGuild({ canManageChannels = true, canManageRoles = true } = {}) {
  const channelCache = new Collection();
  const roleCache = new Collection();
  let nextId = 0;

  const guild = {
    channels: {
      cache: channelCache,
      fetch: async () => channelCache,
      create: async options => {
        const channel = {
          id: `channel-${++nextId}`,
          name: options.name,
          type: options.type,
          parentId: options.parent ?? null,
          topic: options.topic,
        };
        channelCache.set(channel.id, channel);
        return channel;
      },
    },
    roles: {
      cache: roleCache,
      fetch: async () => roleCache,
      create: async options => {
        const role = { id: `role-${++nextId}`, name: options.name, ...options };
        roleCache.set(role.id, role);
        return role;
      },
    },
    members: {
      me: {
        permissions: {
          has(permission) {
            if (permission === PermissionFlagsBits.ManageChannels) return canManageChannels;
            if (permission === PermissionFlagsBits.ManageRoles) return canManageRoles;
            return true;
          },
        },
      },
    },
  };
  return guild;
}

test('Build mode exposes creation tools only', () => {
  const buildTools = getToolsForMode('build');
  const names = buildTools.map(tool => tool.function.name);
  assert.deepEqual(names.sort(), [
    'clone_server_structure',
    'create_category',
    'create_channel',
    'create_role',
  ]);
  assert.ok(!names.includes('delete_channel'));
  assert.ok(!names.includes('kick_member'));

  const channelTool = buildTools.find(tool => tool.function.name === 'create_channel');
  const roleTool = buildTools.find(tool => tool.function.name === 'create_role');
  assert.ok(!Object.hasOwn(channelTool.function.parameters.properties, 'private'));
  assert.ok(!Object.hasOwn(roleTool.function.parameters.properties, 'permissions'));
});

test('AI bulk server builder creates a layout once and skips it on repeat', async () => {
  const guild = createFakeGuild();
  const layout = {
    categories: [{
      name: 'START HERE',
      channels: [
        { name: 'welcome', type: 'text' },
        { name: 'General Voice', type: 'voice' },
      ],
    }],
  };

  const first = await executeTool('clone_server_structure', layout, guild, {});
  assert.match(first, /created: START HERE category, #welcome, 🔊 General Voice/);
  assert.equal(guild.channels.cache.size, 3);
  assert.equal(guild.channels.cache.find(channel => channel.name === 'welcome').type, ChannelType.GuildText);

  const second = await executeTool('clone_server_structure', layout, guild, {});
  assert.match(second, /created: nothing new/);
  assert.match(second, /already existed/);
  assert.equal(guild.channels.cache.size, 3);
});

test('AI builder reports missing bot permissions rather than claiming success', async () => {
  const guild = createFakeGuild({ canManageChannels: false });
  const result = await executeTool('clone_server_structure', {
    categories: [{ name: 'START HERE', channels: [{ name: 'welcome', type: 'text' }] }],
  }, guild, {});

  assert.match(result, /Manage Channels/);
  assert.equal(guild.channels.cache.size, 0);
});

test('AI bulk builder enforces category and channel limits', async () => {
  const guild = createFakeGuild();
  const tooManyCategories = {
    categories: Array.from({ length: 9 }, (_, index) => ({
      name: `category-${index}`,
      channels: [],
    })),
  };
  const result = await executeTool('clone_server_structure', tooManyCategories, guild, {});

  assert.match(result, /at most 8 categories/);
  assert.equal(guild.channels.cache.size, 0);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits, Collection } = require('discord.js');
const {
  findEmergencyRole,
  validateEmergencyRole,
} = require('./emergency-roles');
const { getApplicationOwnerIds, isApplicationOwner } = require('./owner-access');

function makeRole({ id = 'role-1', name = 'Helper', permissions = 0n, position = 1, managed = false } = {}) {
  return {
    id,
    name,
    permissions: { bitfield: permissions },
    position,
    managed,
  };
}

function makeBotMember({ canManageRoles = true, highestPosition = 10 } = {}) {
  return {
    permissions: {
      has(permission) {
        return permission === PermissionFlagsBits.ManageRoles && canManageRoles;
      },
    },
    roles: { highest: { position: highestPosition } },
  };
}

test('emergency role grants reject administrator, server-management, and role-management permissions', () => {
  for (const permission of [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
  ]) {
    assert.match(
      validateEmergencyRole(makeRole({ permissions: permission }), 'guild-1', makeBotMember()),
      /Administrator, Manage Server, or Manage Roles/,
    );
  }
});

test('emergency role grants require bot permissions and a role below the bot', () => {
  assert.match(
    validateEmergencyRole(makeRole(), 'guild-1', makeBotMember({ canManageRoles: false })),
    /Manage Roles/,
  );
  assert.match(
    validateEmergencyRole(makeRole({ position: 10 }), 'guild-1', makeBotMember()),
    /below Conquest’s highest role/,
  );
  assert.equal(validateEmergencyRole(makeRole(), 'guild-1', makeBotMember()), null);
});

test('only exact roles on the allowlist can be selected', () => {
  const roles = new Collection([
    ['role-1', makeRole()],
    ['role-2', makeRole({ id: 'role-2', name: 'Helper' })],
    ['role-3', makeRole({ id: 'role-3', name: 'Member' })],
  ]);
  const guild = { roles: { cache: roles } };

  assert.equal(findEmergencyRole(guild, 'role-1', ['role-1']).role.id, 'role-1');
  assert.match(findEmergencyRole(guild, 'Helper', ['role-1', 'role-2']).error, /use its role ID/);
  assert.match(findEmergencyRole(guild, 'Member', ['role-1']).error, /not on this server’s emergency allowlist/);
});

test('application owners and team members are recognized; others are not', async () => {
  const userClient = {
    application: {
      fetch: async () => ({ owner: { id: 'owner-1' } }),
    },
  };
  assert.equal(await isApplicationOwner(userClient, 'owner-1'), true);
  assert.equal(await isApplicationOwner(userClient, 'member-1'), false);

  const teamClient = {
    application: {
      fetch: async () => ({
        owner: {
          id: 'team-1',
          ownerId: 'owner-1',
          members: new Collection([
            ['member-1', { user: { id: 'member-1' } }],
          ]),
        },
      }),
    },
  };
  const teamOwners = await getApplicationOwnerIds(teamClient);
  assert.equal(teamOwners.has('owner-1'), true);
  assert.equal(teamOwners.has('member-1'), true);
  assert.equal(teamOwners.has('team-1'), false);

  const teamOwnerOnlyClient = {
    application: {
      fetch: async () => ({ owner: { id: 'team-2', ownerId: 'owner-2' } }),
    },
  };
  assert.equal(await isApplicationOwner(teamOwnerOnlyClient, 'owner-2'), true);
  assert.equal(await isApplicationOwner(teamOwnerOnlyClient, 'team-2'), false);
});

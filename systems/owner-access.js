async function getApplicationOwnerIds(client) {
  if (!client.__conquestOwnerIdsPromise) {
    client.__conquestOwnerIdsPromise = (async () => {
      let application = client.application;
      if (typeof client.application?.fetch === 'function') {
        try {
          application = await client.application.fetch();
        } catch {}
      }

      const owner = application?.owner;
      const ownerIds = new Set();
      const members = owner?.members?.values?.();

      if (owner?.ownerId) ownerIds.add(owner.ownerId);
      if (members) {
        for (const member of members) {
          const userId = member.user?.id ?? member.id;
          if (userId) ownerIds.add(userId);
        }
      } else if (!owner?.ownerId && owner?.id) {
        ownerIds.add(owner.id);
      }

      return ownerIds;
    })();
  }

  return client.__conquestOwnerIdsPromise;
}

async function isApplicationOwner(client, userId) {
  const ownerIds = await getApplicationOwnerIds(client);
  return ownerIds.has(userId);
}

module.exports = { getApplicationOwnerIds, isApplicationOwner };

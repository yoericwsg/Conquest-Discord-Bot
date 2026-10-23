const USERNAME_URL = 'https://users.roblox.com/v1/usernames/users';
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const ROBLOX_LINK_RE = /^https:\/\/(?:www\.)?roblox\.com\/(?:share\?code=[^\s]+&type=Server|games\/\d+[^\s]*|private-server\/[^\s]+)/i;

async function resolveUsername(username) {
  const value = String(username ?? '').trim();
  if (!USERNAME_RE.test(value)) throw new Error('Roblox usernames must be 3–20 letters, numbers, or underscores.');
  const response = await fetch(USERNAME_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usernames: [value], excludeBannedUsers: false }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Roblox username lookup failed (${response.status}).`);
  const data = await response.json();
  const user = data?.data?.[0];
  if (!user?.id) throw new Error(`Roblox user "${value}" was not found.`);
  return {
    id: String(user.id),
    name: user.name,
    displayName: user.displayName,
    profileUrl: `https://www.roblox.com/users/${user.id}/profile`,
  };
}

function validateServerLink(value) {
  if (!value) return null;
  const link = String(value).trim();
  if (!ROBLOX_LINK_RE.test(link) || link.length > 512) {
    throw new Error('Server link must be a Roblox game, private-server, or share link.');
  }
  return link;
}

module.exports = { resolveUsername, validateServerLink };

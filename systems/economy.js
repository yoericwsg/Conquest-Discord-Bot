const storage = require('../utils/storage');
const cfg     = require('../config.json');

const WORK_MSGS = [
  'You fixed bugs for a client',
  'You delivered packages',
  'You worked a night shift',
  'You wrote code for a startup',
  'You did freelance design work',
  'You washed cars all day',
  'You ran a food stall',
];

const workCooldowns  = new Map();
const dailyCooldowns = new Map();

function getUser(userId) {
  return storage.get('economy.json', userId, { balance: 0, lastDaily: 0, lastWork: 0, inventory: [] });
}

function saveUser(userId, data) {
  storage.set('economy.json', userId, data);
}

function getBalance(userId) {
  return getUser(userId).balance;
}

function addBalance(userId, amount) {
  const user = getUser(userId);
  user.balance = Math.max(0, (user.balance ?? 0) + amount);
  saveUser(userId, user);
  return user.balance;
}

function claimDaily(userId) {
  const user = getUser(userId);
  const now  = Date.now();
  const cooldown = 86_400_000; // 24 hours

  if (now - (user.lastDaily ?? 0) < cooldown) {
    const remaining = Math.ceil((user.lastDaily + cooldown - now) / 3_600_000);
    return { success: false, remaining };
  }

  const hasLuckyCoin = (user.inventory ?? []).includes('lucky_coin');
  const reward = cfg.economy.dailyReward + (hasLuckyCoin ? Math.floor(cfg.economy.dailyReward * 0.1) : 0);

  user.balance = (user.balance ?? 0) + reward;
  user.lastDaily = now;
  saveUser(userId, user);
  return { success: true, amount: reward };
}

function doWork(userId) {
  const user = getUser(userId);
  const now  = Date.now();
  const cooldown = 3_600_000; // 1 hour

  if (now - (user.lastWork ?? 0) < cooldown) {
    const remaining = Math.ceil((user.lastWork + cooldown - now) / 60_000);
    return { success: false, remaining };
  }

  const earn = cfg.economy.workMin + Math.floor(Math.random() * (cfg.economy.workMax - cfg.economy.workMin));
  const msg  = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];

  user.balance  = (user.balance ?? 0) + earn;
  user.lastWork = now;
  saveUser(userId, user);
  return { success: true, amount: earn, message: msg };
}

function buyItem(userId, itemId) {
  const shop = cfg.economy.shop;
  const item = shop.find(i => i.id === itemId);
  if (!item) return { success: false, reason: 'Item not found.' };

  const user = getUser(userId);
  if ((user.balance ?? 0) < item.price) return { success: false, reason: 'Insufficient funds.' };
  if ((user.inventory ?? []).includes(itemId)) return { success: false, reason: 'You already own this item.' };

  user.balance  = user.balance - item.price;
  user.inventory = [...(user.inventory ?? []), itemId];
  saveUser(userId, user);
  return { success: true, item };
}

function getLeaderboard(limit = 10) {
  const all = storage.read('economy.json');
  return Object.entries(all)
    .sort(([, a], [, b]) => (b.balance ?? 0) - (a.balance ?? 0))
    .slice(0, limit);
}

module.exports = { getUser, saveUser, getBalance, addBalance, claimDaily, doWork, buyItem, getLeaderboard };

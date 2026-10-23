const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sharp = require('sharp');
const { panel, resolveEmoji } = require('../../utils/embed');

const INSTALL_REASON = 'Install unitClan embed emoji set';
const PERMISSION = PermissionFlagsBits.CreateGuildExpressions | PermissionFlagsBits.ManageGuildExpressions;
const CORE_ICONS = [
  { name: 'cq_ok', color: '#57F287', path: '<path d="m31 66 22 22 45-48" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' },
  { name: 'cq_info', color: '#5865F2', path: '<path d="M64 55v37" stroke="#fff" stroke-width="12" stroke-linecap="round"/><circle cx="64" cy="37" r="7" fill="#fff"/>' },
  { name: 'cq_warn', color: '#F0B232', path: '<path d="M64 24 108 101H20Z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="M64 51v23" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="64" cy="87" r="5" fill="#fff"/>' },
  { name: 'cq_error', color: '#ED4245', path: '<path d="m39 39 50 50m0-50L39 89" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' },
  { name: 'cq_shield', color: '#9B59B6', path: '<path d="M64 20 101 34v27c0 24-16 39-37 49C43 100 27 85 27 61V34Z" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><path d="m45 63 13 13 26-28" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' },
  { name: 'cq_star', color: '#E8B84A', path: '<path d="m64 20 13 28 31 4-23 21 6 31-27-16-27 16 6-31-23-21 31-4Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' },
];

// The optional full pack adds 96 named, color-matched symbols for moderation,
// safety, server setup, utilities, community, support, status, and economy.
// Discord emoji slots are limited, so installation stops cleanly when the guild is full.
const FULL_PACK_GROUPS = [
  ['mod', '#ED4245', 'shield', ['ban', 'kick', 'timeout', 'warn', 'unban', 'purge', 'mute', 'unmute', 'case', 'modlog', 'appeal', 'automod']],
  ['safe', '#9B59B6', 'shield', ['raid', 'firewall', 'alert', 'safe', 'verify', 'captcha', 'threat', 'audit', 'protect', 'quarantine', 'checkpoint', 'secure']],
  ['server', '#5865F2', 'users', ['server', 'members', 'owner', 'staff', 'role', 'roles', 'channel', 'category', 'welcome', 'leave', 'rules', 'settings']],
  ['util', '#3498DB', 'info', ['info', 'help', 'ping', 'clock', 'calendar', 'link', 'search', 'command', 'code', 'file', 'upload', 'download']],
  ['community', '#EB459E', 'heart', ['chat', 'forum', 'voice', 'event', 'poll', 'vote', 'party', 'gift', 'heart', 'trophy', 'star', 'level']],
  ['support', '#1ABC9C', 'chat', ['ticket', 'inbox', 'support', 'question', 'answer', 'book', 'docs', 'bug', 'feedback', 'message', 'close', 'reopen']],
  ['status', '#57F287', 'check', ['online', 'offline', 'idle', 'dnd', 'maintenance', 'downtime', 'uptime', 'check', 'cross', 'warning', 'loading', 'sync']],
  ['economy', '#F1C40F', 'star', ['coin', 'wallet', 'shop', 'bag', 'gem', 'credit', 'bank', 'graph', 'arrowup', 'arrowdown', 'trend', 'reward']],
];

const GLYPHS = {
  shield: '<path d="M64 20 101 34v27c0 24-16 39-37 49C43 100 27 85 27 61V34Z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="m45 63 13 13 26-28" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>',
  users: '<circle cx="48" cy="46" r="14" fill="none" stroke="#fff" stroke-width="8"/><circle cx="84" cy="49" r="11" fill="none" stroke="#fff" stroke-width="7"/><path d="M20 101c2-20 12-30 28-30s27 10 29 30m2-25c14-1 23 8 25 24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
  info: '<path d="M64 55v37" stroke="#fff" stroke-width="12" stroke-linecap="round"/><circle cx="64" cy="37" r="7" fill="#fff"/>',
  heart: '<path d="M64 101 27 65C7 42 38 20 56 42l8 10 8-10c18-22 49 0 29 23Z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/>',
  check: '<path d="m31 66 22 22 45-48" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="m39 39 50 50m0-50L39 89" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>',
  star: '<path d="m64 20 13 28 31 4-23 21 6 31-27-16-27 16 6-31-23-21 31-4Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>',
  chat: '<path d="M25 30h78v54H63l-24 16V84H25Z" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><path d="M43 49h42m-42 17h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
};

const GROUP_GLYPHS = {
  mod: ['shield', 'cross', 'check', 'info'], safe: ['shield', 'check', 'star', 'info'],
  server: ['users', 'shield', 'chat', 'info'], util: ['info', 'star', 'check', 'chat'],
  community: ['heart', 'star', 'chat', 'users'], support: ['chat', 'heart', 'info', 'check'],
  status: ['check', 'cross', 'info', 'star'], economy: ['star', 'heart', 'check', 'info'],
};

const FULL_ICONS = FULL_PACK_GROUPS.flatMap(([prefix, color, _glyph, names]) => names.map((name, index) => ({
  name: `cq_${prefix}_${name}`,
  color,
  path: GLYPHS[GROUP_GLYPHS[prefix][index % GROUP_GLYPHS[prefix].length]],
})));

function iconPng(icon) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="38" fill="${icon.color}"/>${icon.path}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  name: 'installembedemoji',
  description: 'Install unitClan embed emoji packs in this server',
  aliases: ['embedemojis'],
  cooldown: 60,
  slash: {
    data: new SlashCommandBuilder()
      .setName('installembedemoji')
      .setDescription('Install unitClan embed emoji packs in this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
      .addBooleanOption(option => option.setName('full').setDescription('Install the full pack of up to 102 symbols').setRequired(false)),
  },
  async execute(source, _args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply(payload) : source.reply(payload);
    const guild = source.guild;
    if (!guild) return reply({ content: 'Run this command inside the server where you want the emoji set installed.' });

    const fullPack = isSlash
      ? source.options.getBoolean('full') === true
      : /^(?:full|all)$/i.test(_args[0] ?? '');

    const actorPermissions = source.member?.permissions;
    if (!actorPermissions?.has(PermissionFlagsBits.ManageGuildExpressions) && !actorPermissions?.has(PermissionFlagsBits.Administrator)) {
      return reply({ content: 'You need **Manage Expressions** permission to install server emojis.' });
    }
    const botMember = guild.members.me ?? await guild.members.fetch(client.user.id).catch(() => null);
    if (!botMember?.permissions?.any(PERMISSION)) {
      return reply({ content: 'I need **Create Expressions** or **Manage Expressions** permission to install server emojis.' });
    }

    try {
      await guild.emojis.fetch();
    } catch (error) {
      return reply({ content: `I could not read this server’s emoji list: ${error.message}` });
    }

    const installed = [];
    const alreadyThere = [];
    const failed = [];
    const icons = fullPack ? [...CORE_ICONS, ...FULL_ICONS] : CORE_ICONS;
    for (const icon of icons) {
      if (guild.emojis.cache.some(existing => existing.name === icon.name)) {
        alreadyThere.push(icon.name);
        continue;
      }
      try {
        await guild.emojis.create({ attachment: await iconPng(icon), name: icon.name, reason: INSTALL_REASON });
        installed.push(icon.name);
      } catch (error) {
        failed.push({ name: icon.name, message: error.message });
        // Avoid hammering Discord when a slot, permission, or API failure stops the upload.
        break;
      }
    }

    const lines = [];
    const formatNames = names => {
      const preview = names.slice(0, 12).map(name => `${resolveEmoji(name, '•')} \`${name}\``).join('\n');
      return `${preview}${names.length > 12 ? `\n…and ${names.length - 12} more` : ''}`;
    };
    if (installed.length) lines.push(`**+ Installed (${installed.length})**\n${formatNames(installed)}`);
    if (alreadyThere.length) lines.push(`**Already installed (${alreadyThere.length})**\n${formatNames(alreadyThere)}`);
    if (failed.length) lines.push(`**Could not install (${failed.length})**\n${failed.map(item => `• \`${item.name}\`: ${item.message}`).join('\n').slice(0, 900)}`);
    if (!lines.length) lines.push('The emoji set is already installed.');
    if (fullPack && failed.some(item => /30008|Maximum number of emojis/i.test(item.message))) {
      lines.push('⚠️ Discord reached this server’s custom emoji slot limit. The emojis installed before the limit remain available; remove unused server emojis or free slots, then run `?installembedemoji full` again to continue.');
    }
    lines.push(fullPack
      ? `Requested **${icons.length} symbols**. The installer adds what this server has room for. Use names like \`cq_mod_ban\`, \`cq_safe_raid\`, and \`cq_server_welcome\` in embed titles and messages.`
      : 'Use `?embed` or `/embed` to make a custom embed. To install the larger set of up to 102 symbols, run `?installembedemoji full` or use `/installembedemoji` with **full: true**. Discord emoji slots are limited, so the full pack may install partially.');
    const embed = panel(client, fullPack ? '✨ unitClan Embed Emoji Studio · Full Pack' : '✨ unitClan Embed Emoji Studio · Core Pack', lines.join('\n\n'));
    return reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

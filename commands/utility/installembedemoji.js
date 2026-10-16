const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sharp = require('sharp');
const { panel, resolveEmoji } = require('../../utils/embed');

const INSTALL_REASON = 'Install Conquest embed emoji set';
const PERMISSION = PermissionFlagsBits.CreateGuildExpressions | PermissionFlagsBits.ManageGuildExpressions;
const ICONS = [
  { name: 'cq_ok', color: '#57F287', path: '<path d="m31 66 22 22 45-48" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' },
  { name: 'cq_info', color: '#5865F2', path: '<path d="M64 55v37" stroke="#fff" stroke-width="12" stroke-linecap="round"/><circle cx="64" cy="37" r="7" fill="#fff"/>' },
  { name: 'cq_warn', color: '#F0B232', path: '<path d="M64 24 108 101H20Z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="M64 51v23" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="64" cy="87" r="5" fill="#fff"/>' },
  { name: 'cq_error', color: '#ED4245', path: '<path d="m39 39 50 50m0-50L39 89" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' },
  { name: 'cq_shield', color: '#9B59B6', path: '<path d="M64 20 101 34v27c0 24-16 39-37 49C43 100 27 85 27 61V34Z" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><path d="m45 63 13 13 26-28" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' },
  { name: 'cq_star', color: '#E8B84A', path: '<path d="m64 20 13 28 31 4-23 21 6 31-27-16-27 16 6-31-23-21 31-4Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' },
];

function iconPng(icon) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="38" fill="${icon.color}"/>${icon.path}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {
  name: 'installembedemoji',
  description: 'Install Conquest’s clean embed emoji set in this server',
  aliases: ['embedemojis'],
  cooldown: 60,
  slash: {
    data: new SlashCommandBuilder()
      .setName('installembedemoji')
      .setDescription('Install Conquest’s clean embed emoji set in this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),
  },
  async execute(source, _args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply(payload) : source.reply(payload);
    const guild = source.guild;
    if (!guild) return reply({ content: 'Run this command inside the server where you want the emoji set installed.' });

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
    for (const icon of ICONS) {
      if (guild.emojis.cache.some(existing => existing.name === icon.name)) {
        alreadyThere.push(icon.name);
        continue;
      }
      try {
        await guild.emojis.create({ attachment: await iconPng(icon), name: icon.name, reason: INSTALL_REASON });
        installed.push(icon.name);
      } catch (error) {
        failed.push({ name: icon.name, message: error.message });
        if (error.code === 30008 || error.rawError?.code === 30008) break;
      }
    }

    const lines = [];
    if (installed.length) lines.push(`**+ Installed (${installed.length})**\n${installed.map(name => `${resolveEmoji(name, '•')} \`${name}\``).join('\n')}`);
    if (alreadyThere.length) lines.push(`**Already installed (${alreadyThere.length})**\n${alreadyThere.map(name => `${resolveEmoji(name, '•')} \`${name}\``).join('\n')}`);
    if (failed.length) lines.push(`**Could not install (${failed.length})**\n${failed.map(item => `• \`${item.name}\`: ${item.message}`).join('\n').slice(0, 900)}`);
    if (!lines.length) lines.push('The emoji set is already installed.');
    lines.push('Use `?embed` or `/embed` to make a custom embed. Conquest’s standard success, warning, and error embeds will use these server emojis automatically where available.');
    const embed = panel(client, '✨ Conquest Embed Emoji Set', lines.join('\n\n'));
    return reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

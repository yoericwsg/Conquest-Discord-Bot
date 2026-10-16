const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');

const MODES = {
  discontinued: 'This service has been discontinued.',
  shutdown: 'This server has been shut down.',
  'temporarily fixing': 'This server is temporarily unavailable while repairs are in progress.',
  maintenance: 'This server is temporarily unavailable for maintenance.',
  emergency: 'This server has been locked down due to an emergency.',
};

module.exports = {
  name: 'lockdownmode',
  description: 'Choose the notice mode used by the server lockdown command',
  cooldown: 3,
  slash: { data: new SlashCommandBuilder()
    .setName('lockdownmode').setDescription('Choose the notice used by server lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('mode').setDescription('Lockdown notice preset').addChoices(
      ...Object.keys(MODES).map(value => ({ name: value, value })),
    )) },
  async execute(message, args) {
    if (!message.guild) return message.reply('Run this command inside the server to configure its lockdown notice.');
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('You need **Administrator** permission to change the lockdown mode.');
    const isSlash = typeof message.isChatInputCommand === 'function' && message.isChatInputCommand();
    const mode = ((isSlash ? message.options.getString('mode') : args.join(' '))?.trim().toLowerCase() ?? '')
      .replace('temporairly fixing', 'temporarily fixing');
    if (!mode) return message.reply(`Current mode: **${storage.get('configs.json', message.guild.id, {}).lockdownMode ?? 'shutdown'}**. Available modes: ${Object.keys(MODES).map(m => `\`${m}\``).join(', ')}.`);
    if (!MODES[mode]) return message.reply(`Unknown mode. Choose: ${Object.keys(MODES).map(m => `\`${m}\``).join(', ')}.`);
    storage.update('configs.json', message.guild.id, config => ({ ...config, lockdownMode: mode }));
    return message.reply(`Lockdown notice mode set to **${mode}**.`);
  },
  MODES,
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, panel, warning } = require('../../utils/embed');
const storage = require('../../utils/storage');
const REASONS_FILE = 'disabled-reasons.json';

// Commands/systems that can never be disabled
const ALWAYS_ON = new Set(['disable', 'enable', 'prefix', 'help', 'ping']);

// Recognised system names (disables the background system, not a command)
const SYSTEMS = new Set(['leveling', 'security', 'welcome', 'autorole', 'aimode']);

module.exports = {
  name: 'disable',
  description: 'Disable a command or system in this server',
  aliases: ['cmdoff'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('disable')
      .setDescription('Disable a command or system in this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o =>
        o.setName('name')
          .setDescription('Command name or system (leveling, security, welcome)')
          .setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why it is being disabled').setMaxLength(300)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const member  = source.member;
    const guild   = source.guild;

    const reply = opts =>
      source.reply?.(opts) ?? source.channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.Administrator))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator**.')] });

    const requested = (isSlash ? source.options.getString('name') : args[0] ?? '').toLowerCase().trim();
    const name = SYSTEMS.has(requested) ? requested : (client.aliases.get(requested) ?? requested);
    const reason = (isSlash ? source.options.getString('reason') : args.slice(1).join(' '))?.trim() || 'No reason provided';
    if (!name)
      return reply({ embeds: [error(client, 'Missing Name', 'Provide a command name or system (e.g. `leveling`, `snipe`)')] });

    const key = SYSTEMS.has(name) ? `system:${name}` : name;

    if (ALWAYS_ON.has(name))
      return reply({ embeds: [warning(client, 'Protected', `\`${name}\` cannot be disabled.`)] });

    // Verify command exists (for non-system entries)
    if (!SYSTEMS.has(name) && !client.prefixCommands.has(name) && !client.commands.has(name))
      return reply({ embeds: [error(client, 'Unknown Command', `No command named \`${name}\` found.\nUse \`?help\` to see all commands.`)] });

    const disabled = storage.get('disabled.json', guild.id, []);
    if (disabled.includes(key))
      return reply({ embeds: [warning(client, 'Already Disabled', `\`${name}\` is already disabled in this server.`)] });

    disabled.push(key);
    storage.set('disabled.json', guild.id, disabled);
    storage.update(REASONS_FILE, guild.id, reasons => ({ ...reasons, [key]: {
      reason: reason.slice(0, 300), actorId: source.user?.id ?? source.author?.id,
      actorTag: source.user?.tag ?? source.author?.tag ?? 'Unknown', changedAt: Date.now(),
    } }));

    return reply({ embeds: [success(client, '🔴  Disabled', `\`${name}\` has been **disabled** in this server.\n**Reason:** ${reason}\nRun \`?enable ${name}\` to turn it back on.`)] });
  },
};

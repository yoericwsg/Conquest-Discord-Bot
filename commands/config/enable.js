const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, warning, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

const SYSTEMS = new Set(['leveling', 'security', 'welcome', 'autorole', 'aimode']);

module.exports = {
  name: 'enable',
  description: 'Re-enable a previously disabled command or system',
  aliases: ['cmdon'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('enable')
      .setDescription('Re-enable a disabled command or system in this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o =>
        o.setName('name')
          .setDescription('Command name or system (leveling, security, welcome)')
          .setRequired(true)),
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
    if (!name)
      return reply({ embeds: [error(client, 'Missing Name', 'Provide a command or system name.')] });

    const key      = SYSTEMS.has(name) ? `system:${name}` : name;
    const disabled = storage.get('disabled.json', guild.id, []);

    if (!disabled.includes(key))
      return reply({ embeds: [warning(client, 'Not Disabled', `\`${name}\` is not currently disabled.`)] });

    storage.set('disabled.json', guild.id, disabled.filter(d => d !== key));
    storage.update('disabled-reasons.json', guild.id, reasons => {
      const next = { ...reasons };
      delete next[key];
      return next;
    });

    return reply({ embeds: [success(client, '🟢  Enabled', `\`${name}\` has been **re-enabled** in this server.`)] });
  },
};

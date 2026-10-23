const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rolecreate',
  description: 'Create a role with an optional server link and ping',
  aliases: ['makerole', 'newrole'],
  cooldown: 8,
  slash: { data: new SlashCommandBuilder().setName('rolecreate').setDescription('Create a polished server role').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles).addStringOption(o => o.setName('name').setDescription('Role name').setRequired(true).setMaxLength(80)).addStringOption(o => o.setName('color').setDescription('Hex color such as #377DFF')).addStringOption(o => o.setName('server_link').setDescription('Optional server or info link')).addBooleanOption(o => o.setName('ping').setDescription('Ping the new role')) },
  async execute(source, args) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply({ ...payload, flags: MessageFlags.Ephemeral }) : source.channel.send(payload);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageRoles)) return reply({ content: 'You need **Manage Roles** permission.', ephemeral: true });
    const name = isSlash ? source.options.getString('name') : String(args.shift() ?? '').replace(/\|.*/, '').trim();
    const colorInput = isSlash ? source.options.getString('color') : null;
    const link = isSlash ? source.options.getString('server_link') : args.find(value => /^https?:\/\//i.test(value));
    const ping = isSlash ? source.options.getBoolean('ping') : args.some(value => value.toLowerCase() === 'ping');
    if (!name) return reply({ content: 'Usage: `?rolecreate Role Name [ping]` or `/rolecreate`.', ephemeral: true });
    const color = /^#[0-9a-f]{6}$/i.test(colorInput ?? '') ? colorInput : '#377DFF';
    const me = source.guild.members.me ?? await source.guild.members.fetchMe().catch(() => null);
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return reply({ content: 'I need **Manage Roles** permission first.', ephemeral: true });
    try {
      const role = await source.guild.roles.create({ name: name.slice(0, 100), color, hoist: true, reason: `unitClan rolecreate by ${source.user?.tag ?? source.author?.tag ?? 'staff'}` });
      const embed = new EmbedBuilder().setColor(color).setTitle('✨ Role created').setDescription(`${role} is ready for your server.`).addFields({ name: 'Role', value: `**${role.name}**` }, { name: 'Color', value: color }, ...(link ? [{ name: 'Server link', value: link.slice(0, 1024) }] : [])).setTimestamp();
      return reply({ content: ping ? `${role}` : undefined, embeds: [embed], allowedMentions: { roles: ping ? [role.id] : [] } });
    } catch (error) { return reply({ content: `Could not create the role: ${error.message}`, ephemeral: true }); }
  },
};


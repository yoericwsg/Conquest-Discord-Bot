const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel, success, error, warning } = require('../../utils/embed');

module.exports = {
  name: 'massrole',
  description: 'Add or remove a role from ALL members in the server',
  aliases: ['bulkrole'],
  cooldown: 30,
  slash: {
    data: new SlashCommandBuilder()
      .setName('massrole')
      .setDescription('Add or remove a role from ALL server members')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o =>
        o.setName('action').setDescription('add or remove').setRequired(true)
          .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addRoleOption(o => o.setName('role').setDescription('The role to assign/remove').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild    = source.guild;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.Administrator))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator**.')] });

    const action = isSlash ? source.options.getString('action') : (args[0] ?? '').toLowerCase();
    const role   = isSlash ? source.options.getRole('role') : source.mentions.roles.first();

    if (!['add', 'remove'].includes(action))
      return reply({ embeds: [error(client, 'Invalid Action', 'Use `add` or `remove`.')] });
    if (!role)
      return reply({ embeds: [error(client, 'Missing Role', 'Mention a role.')] });
    if (role.managed)
      return reply({ embeds: [error(client, 'Managed Role', 'Cannot mass-assign a bot-managed role.')] });
    if (role.position >= guild.members.me.roles.highest.position)
      return reply({ embeds: [error(client, 'Role Too High', 'That role is higher than my highest role.')] });

    await reply({ embeds: [panel(client, '⏳  Processing…',
      `${action === 'add' ? 'Adding' : 'Removing'} **${role.name}** ${action === 'add' ? 'to' : 'from'} all members.\nThis may take a while for large servers…`)] });

    await guild.members.fetch();
    const members  = guild.members.cache.filter(m => !m.user.bot);
    let done = 0, failed = 0;

    for (const [, m] of members) {
      try {
        if (action === 'add' && !m.roles.cache.has(role.id)) {
          await m.roles.add(role, `Mass-role by ${isSlash ? source.user.tag : source.author.tag}`);
          done++;
        } else if (action === 'remove' && m.roles.cache.has(role.id)) {
          await m.roles.remove(role, `Mass-role by ${isSlash ? source.user.tag : source.author.tag}`);
          done++;
        }
      } catch { failed++; }
      // Rate-limit guard
      if ((done + failed) % 10 === 0) await new Promise(r => setTimeout(r, 500));
    }

    const resultEmbed = success(client, `✅  Mass-Role Complete`,
      `**Role:** ${role}\n**Action:** ${action}\n**Updated:** \`${done}\`\n**Failed:** \`${failed}\``);

    const replyFn = source.editReply?.bind(source) ?? (opts => source.channel.send(opts));
    return replyFn({ embeds: [resultEmbed] }).catch(() => source.channel.send({ embeds: [resultEmbed] }));
  },
};

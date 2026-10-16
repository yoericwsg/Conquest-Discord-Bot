const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'nick',
  description: 'Change a member\'s nickname',
  aliases: ['nickname', 'setnick'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('nick')
      .setDescription("Change a member's nickname")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addUserOption(o => o.setName('user').setDescription('Target member').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    if (!source.member.permissions.has(PermissionFlagsBits.ManageNicknames))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Nicknames**.')], ephemeral: true });

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    if (!targetUser) return reply({ embeds: [error(client, 'No User', 'Mention a user.')], ephemeral: true });

    const member = source.guild.members.cache.get(targetUser.id);
    if (!member) return reply({ embeds: [error(client, 'Not Found', 'That user is not in this server.')], ephemeral: true });
    if (!member.manageable) return reply({ embeds: [error(client, 'Cannot Edit', 'I cannot modify this user\'s nickname.')], ephemeral: true });

    const newNick = isSlash ? (source.options.getString('nickname') ?? null) : (args.slice(1).join(' ') || null);

    try {
      await member.setNickname(newNick, `Changed by ${source.member.user.tag}`);
      const msg = newNick ? `Set **${targetUser.username}**'s nickname to \`${newNick}\`.` : `Reset **${targetUser.username}**'s nickname.`;
      await reply({ embeds: [success(client, 'Nickname Updated', msg)] });
    } catch (e) {
      await reply({ embeds: [error(client, 'Failed', e.message)], ephemeral: true });
    }
  },
};

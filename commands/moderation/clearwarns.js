const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'clearwarns',
  description: 'Clear all warnings for a member',
  aliases: ['warnreset', 'wipewarns'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('clearwarns')
      .setDescription('Clear all warnings for a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(o => o.setName('user').setDescription('Member to clear').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild   = source.guild;
    const member  = source.member;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.Administrator))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator**.')] });

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    if (!targetUser)
      return reply({ embeds: [error(client, 'Missing User', 'Mention a member.')] });

    const key = `${guild.id}:${targetUser.id}`;
    storage.set('warnings.json', key, []);

    return reply({ embeds: [success(client, '🧹  Warnings Cleared',
      `All warnings for **${targetUser.tag}** have been removed.`)] });
  },
};

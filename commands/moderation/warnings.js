const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel, error, info } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'warnings',
  description: 'View all warnings for a member',
  aliases: ['infractions', 'warnlist'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View all warnings for a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('Member to check').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild   = source.guild;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    const targetUser = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    if (!targetUser)
      return reply({ embeds: [error(client, 'Missing User', 'Mention a member.')] });

    const key   = `${guild.id}:${targetUser.id}`;
    const warns = storage.get('warnings.json', key, []);

    if (!warns.length)
      return reply({ embeds: [info(client, '✅  No Warnings', `${targetUser.tag} has no warnings in this server.`)] });

    const lines = warns.map((w, i) => {
      const date = new Date(w.timestamp).toLocaleDateString();
      return `**${i + 1}.** ${w.reason}\n> By ${w.moderator} — ${date}`;
    });

    return reply({ embeds: [panel(client, `⚠️  Warnings — ${targetUser.tag}`,
      `${targetUser} has **${warns.length}** warning(s).\n\n${lines.join('\n\n')}`)] });
  },
};

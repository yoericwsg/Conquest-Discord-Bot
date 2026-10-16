const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../../utils/embed');

module.exports = {
  name: 'userinfo',
  description: 'Display information about a user',
  aliases: ['ui', 'whois'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('Display information about a user')
      .addUserOption(o => o.setName('user').setDescription('User to inspect')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const guild   = source.guild;

    const user   = isSlash ? (source.options.getUser('user') ?? source.user)
      : (source.mentions.users.first() ?? source.author);
    const member = guild?.members.cache.get(user.id);

    const roles = member?.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .slice(0, 8)
      .join(' ') || 'None';

    await reply({
      embeds: [info(client, `👤  ${member?.displayName ?? user.username}`, [
        { name: 'Tag',          value: user.tag,                                                        inline: true },
        { name: 'ID',           value: user.id,                                                         inline: true },
        { name: 'Bot',          value: user.bot ? 'Yes' : 'No',                                         inline: true },
        { name: 'Created',      value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,              inline: true },
        { name: 'Joined',       value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
        { name: 'Nickname',     value: member?.nickname ?? 'None',                                      inline: true },
        { name: `Roles (${member?.roles.cache.size - 1 ?? 0})`, value: roles },
      ]).setThumbnail(user.displayAvatarURL({ size: 256 }))],
    });
  },
};

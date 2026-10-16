const { SlashCommandBuilder } = require('discord.js');
const { base } = require('../../utils/embed');

module.exports = {
  name: 'avatar',
  description: "Get a user's avatar",
  aliases: ['av', 'pfp'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription("Get a user's avatar")
      .addUserOption(o => o.setName('user').setDescription('Target user')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const user   = isSlash ? (source.options.getUser('user') ?? source.user)
      : (source.mentions.users.first() ?? source.author);
    const member = source.guild?.members.cache.get(user.id);

    const global = user.displayAvatarURL({ size: 4096 });
    const server = member?.displayAvatarURL({ size: 4096 });

    const embed = base(client)
      .setTitle(`🖼️  ${user.username}'s Avatar`)
      .setImage(server ?? global)
      .addFields({ name: 'Global', value: `[Link](${global})`, inline: true });

    if (server && server !== global) {
      embed.addFields({ name: 'Server', value: `[Link](${server})`, inline: true });
    }

    await reply({ embeds: [embed] });
  },
};

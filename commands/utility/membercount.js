const { SlashCommandBuilder } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'membercount',
  description: 'Show the server member count',
  aliases: ['members', 'mc'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('membercount').setDescription('Show the server member count breakdown') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const guild   = source.guild;
    const total   = guild.memberCount;
    const online  = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const bots    = guild.members.cache.filter(m => m.user.bot).size;
    const humans  = total - bots;

    await reply({
      embeds: [panel(client, `👥  ${guild.name} Member Count`, [
        `**Total:**    \`${total.toLocaleString()}\``,
        `**Humans:**   \`${humans.toLocaleString()}\``,
        `**Bots:**     \`${bots.toLocaleString()}\``,
        `**Online:**   \`${online.toLocaleString()}\``,
      ])],
    });
  },
};

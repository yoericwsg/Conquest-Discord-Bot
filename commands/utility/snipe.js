const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { base, error, SEP } = require('../../utils/embed');

module.exports = {
  name: 'snipe',
  description: 'Show the last deleted message in this channel',
  aliases: ['s'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('snipe')
      .setDescription('Show the last deleted message in this channel'),
  },
  async execute(source, args, client) {
    const channel  = source.channel ?? source.options?.getChannel?.('channel') ?? source.channel;
    const sniped   = client.sniped?.get(channel.id);

    if (!sniped) {
      const e = error(client, 'Nothing to Snipe', 'No recently deleted messages found in this channel.');
      return source.reply?.({ embeds: [e] }) ?? source.channel.send({ embeds: [e] });
    }

    const embed = base(client)
      .setColor('#5865F2')
      .setAuthor({ name: `${sniped.author.tag} said…`, iconURL: sniped.author.displayAvatarURL() })
      .setDescription(sniped.content || '*[no text content]*')
      .setFooter({ text: `Deleted in #${channel.name} ${SEP} ${new Date(sniped.deletedAt).toLocaleTimeString()}` });

    if (sniped.attachments?.length) {
      embed.setImage(sniped.attachments[0]);
    }

    const reply = { embeds: [embed] };
    return source.reply?.(reply) ?? source.channel.send(reply);
  },
};

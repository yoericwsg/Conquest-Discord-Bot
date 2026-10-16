const { SlashCommandBuilder } = require('discord.js');
const { base, error, SEP } = require('../../utils/embed');

module.exports = {
  name: 'editsnipe',
  description: 'Show the last edited message in this channel',
  aliases: ['esnipe', 'es'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('editsnipe')
      .setDescription('Show the last edited message in this channel'),
  },
  async execute(source, args, client) {
    const channel  = source.channel;
    const sniped   = client.editSniped?.get(channel.id);

    if (!sniped) {
      const e = error(client, 'Nothing to Edit-Snipe', 'No recently edited messages found in this channel.');
      return source.reply?.({ embeds: [e] }) ?? source.channel.send({ embeds: [e] });
    }

    const embed = base(client)
      .setColor('#EB459E')
      .setAuthor({ name: `${sniped.author.tag} edited…`, iconURL: sniped.author.displayAvatarURL() })
      .addFields(
        { name: '❌ Before', value: sniped.oldContent || '*[no text]*', inline: false },
        { name: '✅ After',  value: sniped.newContent || '*[no text]*', inline: false },
      )
      .setFooter({ text: `Edited in #${channel.name} ${SEP} ${new Date(sniped.editedAt).toLocaleTimeString()}` });

    const reply = { embeds: [embed] };
    return source.reply?.(reply) ?? source.channel.send(reply);
  },
};

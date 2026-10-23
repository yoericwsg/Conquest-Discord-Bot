const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'raidend',
  description: 'End the active clan raid callout',
  aliases: ['clanraidend', 'endraid'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('raidend')
      .setDescription('End the active clan raid callout')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply({ ...payload, ephemeral: true }) : source.channel.send(payload);
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return reply({ embeds: [error(client, 'No Permission', 'Manage Server permission is required to end a clan raid.')] });
    }
    const event = storage.get('raid-events.json', source.guild.id, null);
    if (!event) return reply({ embeds: [error(client, 'No Active Raid', 'There is no active clan raid in this server.')] });
    storage.set('raid-events.json', source.guild.id, null);
    return reply({ embeds: [success(client, 'Clan Raid Ended', `The raid callout for **${event.displayName} (@${event.username})** has been closed.`)] });
  },
};

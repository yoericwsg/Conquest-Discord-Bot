const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'verifyoff',
  description: 'Disable the server verification panel',
  aliases: ['disableverify', 'verifydisable'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('verifyoff')
      .setDescription('Disable the configured verification panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  },
  async execute(source, args, client) {
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const payload = { embeds: [error(client, 'No Permission', 'Manage Server is required to disable verification.')] };
      return typeof source.isChatInputCommand === 'function' && source.isChatInputCommand()
        ? source.reply({ ...payload, ephemeral: true })
        : source.channel.send(payload);
    }
    const configs = storage.get('configs.json', source.guild.id, {});
    const hadConfig = Boolean(configs.verifyChannel || configs.verifyRole);
    delete configs.verifyChannel;
    delete configs.verifyRole;
    storage.set('configs.json', source.guild.id, configs);
    const payload = { embeds: [success(client, 'Verification Disabled', hadConfig ? 'The verification configuration was removed. Existing messages remain in place.' : 'Verification was not configured.')] };
    return typeof source.isChatInputCommand === 'function' && source.isChatInputCommand()
      ? source.reply({ ...payload, ephemeral: true })
      : source.channel.send(payload);
  },
};


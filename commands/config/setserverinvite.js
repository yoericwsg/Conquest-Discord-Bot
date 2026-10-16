const { PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storage');
const { success, error, info } = require('../../utils/embed');
const { validateGuildInvite } = require('../../systems/server-directory');

module.exports = {
  name: 'setserverinvite',
  description: 'Set the admin-approved invite shown in the private server directory',
  aliases: ['serverinvite'],
  cooldown: 10,
  async execute(source, args, client) {
    if (!source.guild) {
      return source.channel.send('Run this command inside the server whose invite you want to approve.');
    }
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return source.channel.send({
        embeds: [error(client, 'No Permission', 'You need **Manage Server** to approve this server’s directory invite.')],
      });
    }

    const config = storage.get('configs.json', source.guild.id, {});
    const input = args.join(' ').trim();
    if (['clear', 'remove', 'none'].includes(input.toLowerCase())) {
      delete config.serverInvite;
      storage.set('configs.json', source.guild.id, config);
      return source.channel.send({
        embeds: [info(client, 'Server invite removed', [], 'This server will still appear in `?serversin`, but without a join link.')],
      });
    }
    if (!input) {
      return source.channel.send({
        embeds: [info(client, 'Approve a server invite', [], 'Use `?setserverinvite <Discord invite>` or `?setserverinvite clear`. The invite must belong to this server.')],
      });
    }

    try {
      config.serverInvite = await validateGuildInvite(client, source.guild.id, input);
      storage.set('configs.json', source.guild.id, config);
      return source.channel.send({
        embeds: [success(client, 'Directory invite approved', `This server’s invite is saved for the owner-only \`?serversin\` directory: ${config.serverInvite}`)],
      });
    } catch (err) {
      return source.channel.send({
        embeds: [error(client, 'Invite not saved', err.message)],
      });
    }
  },
};

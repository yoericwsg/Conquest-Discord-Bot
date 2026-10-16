const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'purge',
  description: 'Bulk delete messages',
  aliases: ['clear', 'prune'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Bulk delete messages in this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1–100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();

    if (!source.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const opts = { embeds: [error(client, 'No Permission', 'You need **Manage Messages** permission.')], ephemeral: true };
      return isSlash ? source.reply(opts) : source.channel.send(opts);
    }

    if (isSlash) await source.deferReply({ ephemeral: true });

    const amount   = isSlash ? source.options.getInteger('amount') : parseInt(args[0]);
    const filterUser = isSlash ? source.options.getUser('user') : (source.mentions.users.first() ?? null);
    const channel  = source.channel;

    if (!amount || amount < 1 || amount > 100) {
      const opts = { embeds: [error(client, 'Invalid', 'Provide a number between 1 and 100.')], ephemeral: true };
      return isSlash ? source.editReply(opts) : source.channel.send(opts);
    }

    try {
      let messages = await channel.messages.fetch({ limit: 100 });
      if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
      const toDelete = [...messages.values()].slice(0, amount);
      const deleted  = await channel.bulkDelete(toDelete, true);

      const reply = success(client, 'Messages Purged', `Deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser.tag}` : ''}.`);
      if (isSlash) {
        await source.editReply({ embeds: [reply] });
      } else {
        const m = await source.channel.send({ embeds: [reply] });
        setTimeout(() => m.delete().catch(() => null), 5000);
      }
    } catch (e) {
      const opts = { embeds: [error(client, 'Failed', e.message)], ephemeral: true };
      isSlash ? source.editReply(opts) : source.channel.send(opts);
    }
  },
};

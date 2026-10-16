const { SlashCommandBuilder } = require('discord.js');
const { success, error } = require('../../utils/embed');
const economy = require('../../systems/economy');
const cfg = require('../../config.json');

module.exports = {
  name: 'buy',
  description: 'Buy an item from the shop',
  aliases: ['purchase'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('buy')
      .setDescription('Buy an item from the shop')
      .addStringOption(o =>
        o.setName('item').setDescription('Item ID to buy').setRequired(true)
          .addChoices(...cfg.economy.shop.map(i => ({ name: i.name, value: i.id })))
      ),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const userId = source.user?.id ?? source.author?.id;
    const itemId = isSlash ? source.options.getString('item') : args[0]?.toLowerCase();

    if (!itemId) return reply({ embeds: [error(client, 'No Item', 'Specify an item ID. Use `?shop` to browse.')], ephemeral: true });

    const result = economy.buyItem(userId, itemId);
    if (!result.success) {
      return reply({ embeds: [error(client, 'Purchase Failed', result.reason)], ephemeral: true });
    }

    await reply({
      embeds: [success(client, '🛍️  Purchase Successful!', `You bought **${result.item.name}** for **${result.item.price.toLocaleString()}** ${cfg.economy.currency} coins!\n\nNew balance: **${economy.getBalance(userId).toLocaleString()}** coins`)],
    });
  },
};

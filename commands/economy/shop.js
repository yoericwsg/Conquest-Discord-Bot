const { SlashCommandBuilder } = require('discord.js');
const { panel, progressBar } = require('../../utils/embed');
const cfg = require('../../config.json');

module.exports = {
  name: 'shop',
  description: 'Browse the item shop',
  aliases: ['store', 'market'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('shop').setDescription('Browse the item shop') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const items = cfg.economy.shop;
    const lines = items.flatMap(item => [
      `**${item.name}** — \`${item.id}\``,
      `  ${cfg.economy.currency} **${item.price.toLocaleString()}** coins  •  ${item.description}`,
      ``,
    ]);

    lines.push(`Use \`?buy <item_id>\` or \`/buy\` to purchase.`);

    await reply({ embeds: [panel(client, `🛒  unitClan Shop`, lines)] });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { success, error } = require('../../utils/embed');
const economy = require('../../systems/economy');
const cfg = require('../../config.json');

module.exports = {
  name: 'work',
  description: 'Work to earn coins (1 hour cooldown)',
  aliases: ['grind', 'earn'],
  cooldown: 3,
  slash: { data: new SlashCommandBuilder().setName('work').setDescription('Work to earn coins (1 hour cooldown)') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const userId = source.user?.id ?? source.author?.id;
    const result = economy.doWork(userId);

    if (!result.success) {
      return reply({
        embeds: [error(client, 'Still Tired', `You already worked recently.\nCome back in **${result.remaining} minutes**.`)],
        ephemeral: true,
      });
    }

    await reply({
      embeds: [success(client, '💼  Work Complete', `${result.message}.\nYou earned **${result.amount.toLocaleString()}** ${cfg.economy.currency} coins!\n\nBalance: **${economy.getBalance(userId).toLocaleString()}** coins`)],
    });
  },
};

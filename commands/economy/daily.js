const { SlashCommandBuilder } = require('discord.js');
const { success, error } = require('../../utils/embed');
const economy = require('../../systems/economy');
const cfg = require('../../config.json');

module.exports = {
  name: 'daily',
  description: 'Claim your daily coin reward',
  aliases: ['claim'],
  cooldown: 3,
  slash: { data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coin reward') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const userId  = source.user?.id ?? source.author?.id;
    const result  = economy.claimDaily(userId);

    if (!result.success) {
      return reply({
        embeds: [error(client, 'Already Claimed', `You already claimed your daily reward.\nCome back in **${result.remaining}h**.`)],
        ephemeral: true,
      });
    }

    await reply({
      embeds: [success(client, 'Daily Reward Claimed!', `You received **${result.amount.toLocaleString()}** ${cfg.economy.currency} coins!\n\nNew balance: **${economy.getBalance(userId).toLocaleString()}** coins`)],
    });
  },
};

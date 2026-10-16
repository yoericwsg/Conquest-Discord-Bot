const { SlashCommandBuilder } = require('discord.js');
const { success, info, SEP } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'afk',
  description: 'Set or clear your AFK status',
  aliases: [],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set your AFK status (bot will notify people who ping you)')
      .addStringOption(o =>
        o.setName('reason').setDescription('Reason for being AFK').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const userId  = isSlash ? source.user.id : source.author.id;
    const reason  = isSlash
      ? (source.options.getString('reason') ?? 'AFK')
      : (args.join(' ') || 'AFK');

    const afk     = storage.get('afk.json', userId, null);

    if (afk) {
      storage.set('afk.json', userId, null);
      const gone = Date.now() - afk.since;
      const mins = Math.floor(gone / 60000);
      const embed = info(client, '👋  Welcome Back!', `Your AFK status has been removed.\nYou were away for **${mins} min**.`);
      return source.reply?.({ embeds: [embed] }) ?? source.channel.send({ embeds: [embed] });
    }

    storage.set('afk.json', userId, { reason, since: Date.now() });
    const embed = success(client, '💤  AFK Set', `I'll let people know you're away.\n**Reason:** ${reason}`);
    return source.reply?.({ embeds: [embed] }) ?? source.channel.send({ embeds: [embed] });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { base, SEP, error } = require('../../utils/embed');

const STYLES = [
  ['t', 'Short Time'], ['T', 'Long Time'],
  ['d', 'Short Date'], ['D', 'Long Date'],
  ['f', 'Short Date/Time'], ['F', 'Long Date/Time'],
  ['R', 'Relative'],
];

module.exports = {
  name: 'timestamp',
  description: 'Generate Discord timestamp tags for a given time',
  aliases: ['ts', 'discordtime'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('timestamp')
      .setDescription('Generate Discord timestamp tags')
      .addIntegerOption(o => o.setName('minutes_from_now').setDescription('Minutes from now (default 0 = right now)').setRequired(false)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    let mins = isSlash ? source.options.getInteger('minutes_from_now') : parseInt(args[0], 10);
    if (isNaN(mins)) mins = 0;

    const unix = Math.floor(Date.now() / 1000) + mins * 60;
    const lines = STYLES.map(([code, label]) => `**${label}:** \`<t:${unix}:${code}>\` → <t:${unix}:${code}>`);

    const embed = base(client)
      .setTitle('🕒 Discord Timestamp Tags')
      .setDescription(`${SEP}\n${lines.join('\n')}\n${SEP}\nCopy any \`<t:...>\` tag and paste it in a message.`);

    await reply({ embeds: [embed] });
  },
};

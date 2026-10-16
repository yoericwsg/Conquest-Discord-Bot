const { SlashCommandBuilder } = require('discord.js');
const { success, error, warning } = require('../../utils/embed');

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * mult[unit];
}

module.exports = {
  name: 'remind',
  description: 'Set a reminder',
  aliases: ['remindme', 'timer'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('remind')
      .setDescription('Set a reminder')
      .addStringOption(o => o.setName('time').setDescription('Duration: 10s, 5m, 2h, 1d').setRequired(true))
      .addStringOption(o => o.setName('reminder').setDescription('What to remind you of').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply    = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const timeStr  = isSlash ? source.options.getString('time') : args[0];
    const reminder = isSlash ? source.options.getString('reminder') : args.slice(1).join(' ');
    const user     = source.user ?? source.author;

    if (!timeStr || !reminder)
      return reply({ embeds: [error(client, 'Missing Args', 'Provide a time and reminder text.\nExample: `remind 10m Take a break`')], ephemeral: true });

    const ms = parseDuration(timeStr);
    if (!ms) return reply({ embeds: [error(client, 'Invalid Time', 'Use format: `10s`, `5m`, `2h`, `1d`')], ephemeral: true });
    if (ms > 86400000 * 7) return reply({ embeds: [error(client, 'Too Long', 'Max reminder duration is 7 days.')], ephemeral: true });

    const fireAt = Math.floor((Date.now() + ms) / 1000);
    await reply({ embeds: [success(client, '⏰  Reminder Set', `I will remind you at <t:${fireAt}:T> (<t:${fireAt}:R>).\n**Note:** ${reminder}`)] });

    setTimeout(async () => {
      try {
        await user.send({
          embeds: [success(client, '⏰  Reminder!', `You asked me to remind you:\n\n**${reminder}**`)],
        });
      } catch {
        source.channel?.send({
          content: `${user}`,
          embeds: [success(client, '⏰  Reminder!', `**${reminder}**`)],
        }).catch(() => null);
      }
    }, ms);
  },
};

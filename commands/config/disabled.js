const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel, info } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'disabled',
  description: 'List all disabled commands and systems in this server',
  aliases: ['disabledcmds'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('disabled')
      .setDescription('List all disabled commands and systems in this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  },
  async execute(source, args, client) {
    const guild    = source.guild;
    const disabled = storage.get('disabled.json', guild.id, []);
    const reasons = storage.get('disabled-reasons.json', guild.id, {});

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!disabled.length)
      return reply({ embeds: [info(client, '✅  Nothing Disabled', 'All commands and systems are active in this server.')] });

    const describe = d => {
      const entry = reasons[d];
      const reason = entry?.reason ? ` — ${entry.reason}` : '';
      return `\`${d.replace('system:', '')}\`${reason}`;
    };
    const systems  = disabled.filter(d => d.startsWith('system:')).map(d => `🔧 ${describe(d)}`);
    const commands = disabled.filter(d => !d.startsWith('system:')).map(d => `📌 ${describe(d)}`);

    const lines = [];
    if (systems.length)  lines.push('**Systems:**\n' + systems.join('\n'));
    if (commands.length) lines.push('**Commands:**\n' + commands.join('\n'));
    lines.push(`\nUse \`?enable <name>\` to re-enable any item.`);

    return reply({ embeds: [panel(client, `🔴  Disabled in ${guild.name}`, lines.join('\n\n'))] });
  },
};

const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const security = require('../../systems/security');
const { base, error, success } = require('../../utils/embed');

const MODES = {
  off: 'No join-burst alerts or verification changes.',
  low: 'Alert at 10 joins in 10 seconds; no automatic changes.',
  medium: 'Alert at 5 joins in 5 seconds; no automatic changes.',
  high: 'At 3 joins in 5 seconds, raise verification temporarily for 10 minutes and alert.',
};

module.exports = {
  name: 'antiraid',
  description: 'View or set unitClan anti-raid sensitivity in owner/team DMs',
  cooldown: 5,
  slash: { data: new SlashCommandBuilder()
    .setName('antiraid').setDescription('View or set unitClan anti-raid sensitivity')
    .setContexts(InteractionContextType.BotDM)
    .addStringOption(option => option.setName('mode').setDescription('Monitoring level').addChoices(
      ...Object.keys(MODES).map(value => ({ name: value, value })),
    )) },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const reply = payload => isSlash ? source.reply(payload) : source.channel.send(payload);
    if (source.guild) return reply({ content: 'Run this command in unitClan’s DMs.' });
    if (!await isApplicationOwner(client, actor.id))
      return reply({ content: 'This command is restricted to the verified unitClan owner/team.' });
    const requested = isSlash ? source.options.getString('mode') : String(args[0] ?? '').toLowerCase();
    if (!requested) {
      const current = security.getAntiRaidMode();
      return reply({ embeds: [base(client).setTitle('🛡️ unitClan anti-raid').setDescription(
        `Current mode: **${current}**\n\n${Object.entries(MODES).map(([mode, description]) => `**${mode}** — ${description}`).join('\n\n')}`,
      )] });
    }
    if (!(requested in MODES))
      return reply({ embeds: [error(client, 'Unknown mode', 'Choose `off`, `low`, `medium`, or `high`.')] });
    security.setAntiRaidMode(requested);
    return reply({ embeds: [success(client, `Anti-raid: ${requested}`, MODES[requested])] });
  },
};

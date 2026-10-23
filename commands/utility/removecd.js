const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const { error, success } = require('../../utils/embed');
module.exports = {
  name: 'removecd', aliases: ['clearcd', 'resetcd'], description: 'Clear a command cooldown in owner DMs', cooldown: 2,
  slash: { data: new SlashCommandBuilder().setName('removecd').setDescription('Clear a command cooldown (bot DMs only)').setContexts(InteractionContextType.BotDM).addStringOption(o => o.setName('command').setDescription('Command name').setRequired(true)).addStringOption(o => o.setName('user_id').setDescription('Optional user ID')) },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand(); const actor = source.user ?? source.author;
    const reply = payload => isSlash ? source.reply({ ...payload, allowedMentions: { parse: [] } }) : source.channel.send({ ...payload, allowedMentions: { parse: [] } });
    if (source.guild) return reply({ embeds: [error(client, 'DM only', 'Run this command in my DMs.')] });
    if (!await isApplicationOwner(client, actor.id)) return reply({ embeds: [error(client, 'Owner only', 'This command is restricted to the verified team.')] });
    const command = String(isSlash ? source.options.getString('command') : args[0] ?? '').toLowerCase().replace(/^\?/, ''); const userId = isSlash ? source.options.getString('user_id') : args[1];
    if (!command) return reply({ embeds: [error(client, 'Missing command', 'Use `?removecd <command> [userId]`.')] });
    const map = client.cooldowns.get(command); let cleared = 0;
    if (map) { if (userId) { if (map.delete(userId)) cleared++; } else { cleared = map.size; map.clear(); } }
    for (const key of client.__conquestDmCommandCooldowns?.keys?.() ?? []) if (key.startsWith(`${command}:`) && (!userId || key.endsWith(`:${userId}`))) { client.__conquestDmCommandCooldowns.delete(key); cleared++; }
    return reply({ embeds: [success(client, 'Cooldown cleared', 'Cleared **' + cleared + '** cooldown entr' + (cleared === 1 ? 'y' : 'ies') + ' for **' + command + '**' + (userId ? ' on **' + userId + '**' : '') + '.')] });
  },
};



const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const { error, success } = require('../../utils/embed');
module.exports = {
  name: 'cooldownremove', aliases: ['removecooldown', 'clearservercd'], description: 'Clear every command cooldown for a server in owner DMs', cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('cooldownremove').setDescription('Clear every command cooldown for a server (bot DMs only)').setContexts(InteractionContextType.BotDM).addStringOption(o => o.setName('server_id').setDescription('Server ID').setRequired(true)) },
  async execute(source, args, client) {
    const slash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand(); const actor = source.user ?? source.author;
    const reply = payload => slash ? source.reply({ ...payload, allowedMentions: { parse: [] } }) : source.channel.send({ ...payload, allowedMentions: { parse: [] } });
    if (source.guild) return reply({ embeds: [error(client, 'DM only', 'Run this command in my DMs.')] });
    if (!await isApplicationOwner(client, actor.id)) return reply({ embeds: [error(client, 'Owner only', 'This command is restricted to the verified team.')] });
    const serverId = String(slash ? source.options.getString('server_id') : args[0] ?? '').trim();
    if (!/^\d{17,20}$/.test(serverId)) return reply({ embeds: [error(client, 'Invalid server ID', 'Use `?cooldownremove <serverID>`.')] });
    let cleared = 0;
    for (const map of client.cooldowns.values()) for (const key of map.keys()) if (key.startsWith(`${serverId}:`)) { map.delete(key); cleared++; }
    for (const key of client.__conquestDmCommandCooldowns?.keys?.() ?? []) if (key.startsWith(`${serverId}:`)) { client.__conquestDmCommandCooldowns.delete(key); cleared++; }
    for (const key of global.__verifyCooldown?.keys?.() ?? []) if (key.startsWith(`${serverId}_`)) { global.__verifyCooldown.delete(key); cleared++; }
    return reply({ embeds: [success(client, 'Server cooldowns cleared', `Cleared **${cleared}** cooldown entr${cleared === 1 ? 'y' : 'ies'} for server \`${serverId}\`.`)] });
  },
};


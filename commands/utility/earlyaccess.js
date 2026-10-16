const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const earlyAccess = require('../../systems/early-access');
const { base, error, success } = require('../../utils/embed');

function renderList(client) {
  const entries = earlyAccess.getEarlyAccessGuilds()
    .filter(entry => entry.release === earlyAccess.RELEASE)
    .sort((a, b) => String(a.guildName ?? a.guildId).localeCompare(String(b.guildName ?? b.guildId)));
  const description = entries.length
    ? entries.slice(0, 20).map((entry, index) => {
      const name = String(entry.guildName ?? 'Unknown server').replace(/([\\`*_~|])/g, '\\$1').slice(0, 100);
      const addedAt = Number.isFinite(entry.addedAt) ? Math.floor(entry.addedAt / 1000) : null;
      return `**${index + 1}. ${name}**\nID: \`${entry.guildId}\`${addedAt ? ` · Added <t:${addedAt}:R>` : ''}`;
    }).join('\n\n') + (entries.length > 20 ? `\n\n…and ${entries.length - 20} more. Use server IDs with remove to manage them.` : '')
    : 'No servers have been selected for the v4.6.2 early-access cohort yet.';
  return base(client).setTitle('🧪 Conquest v4.6.2 early access')
    .setDescription(description.slice(0, 4000))
    .setFooter({ text: `${entries.length} selected server${entries.length === 1 ? '' : 's'} · selection does not message or change servers` });
}

module.exports = {
  name: 'earlyaccess',
  aliases: ['earlyacsess'],
  description: 'Manage the v4.6.2 early-access server cohort in owner DMs',
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('earlyaccess')
      .setDescription('Manage the v4.6.2 early-access server cohort (bot DMs only)')
      .setContexts(InteractionContextType.BotDM)
      .addSubcommand(subcommand => subcommand.setName('add').setDescription('Select a server for the test cohort')
        .addStringOption(option => option.setName('server_id').setDescription('Server ID (Conquest must already be in it)').setRequired(true)))
      .addSubcommand(subcommand => subcommand.setName('remove').setDescription('Remove a server from the test cohort')
        .addStringOption(option => option.setName('server_id').setDescription('Server ID').setRequired(true)))
      .addSubcommand(subcommand => subcommand.setName('list').setDescription('List selected test servers')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const reply = payload => {
      const safePayload = { ...payload, allowedMentions: { parse: [] } };
      return isSlash ? source.reply(safePayload) : source.channel.send(safePayload);
    };

    if (source.guild) return reply({ content: 'Run this command in Conquest’s DMs.' });
    if (!await isApplicationOwner(client, actor.id)) {
      return reply({ content: 'This command is restricted to the verified Conquest application owner/team.' });
    }

    const action = isSlash ? source.options.getSubcommand() : String(args[0] ?? '').toLowerCase();
    if (!action || action === 'list') return reply({ embeds: [renderList(client)] });

    const isRemove = ['remove', 'delete', 'off'].includes(action);
    const guildId = isSlash
      ? source.options.getString('server_id')
      : (isRemove ? args[1] : action === 'add' ? args[1] : action);
    if (!earlyAccess.SNOWFLAKE.test(String(guildId ?? ''))) {
      return reply({ embeds: [error(client, 'Check the server ID',
        'Use `?earlyaccess <serverID>`, `?earlyaccess remove <serverID>`, or `?earlyaccess list`.') ] });
    }

    if (isRemove) {
      if (!earlyAccess.removeEarlyAccessGuild(guildId)) {
        return reply({ embeds: [error(client, 'Server not selected', `Server \`${guildId}\` is not in the v4.6.2 early-access cohort.`)] });
      }
      return reply({ embeds: [success(client, 'Server removed', `Server \`${guildId}\` was removed from the v4.6.2 early-access cohort.`)] });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return reply({ embeds: [error(client, 'Server not found',
        `Conquest is not currently in server \`${guildId}\`. Add Conquest to that server first, then select it here.`)] });
    }
    const result = earlyAccess.addEarlyAccessGuild(guild, actor);
    const safeName = String(guild.name).replace(/([\\`*_~|])/g, '\\$1').slice(0, 100);
    if (!result.added) {
      return reply({ embeds: [base(client).setTitle('🧪 Already selected')
        .setDescription(`**${safeName}** is already in the v4.6.2 early-access cohort.`)] });
    }
    return reply({ embeds: [success(client, 'Server selected for testing',
      `**${safeName}** has been added to the v4.6.2 early-access cohort. This only records the selection; it does not send a message or change the server.`)] });
  },
};

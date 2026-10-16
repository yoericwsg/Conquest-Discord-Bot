const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, base, SEP } = require('../../utils/embed');
const { getPrefix } = require('../../utils/prefix');
const customcmds = require('../../systems/customcmds');

const RESERVED = new Set([
  'help','ping','ban','kick','mute','timeout','unban','purge','lock','unlock',
  'warn','warnings','clearwarns','nick','softban','roleadd','roleremove','slowmode',
  'massrole','nuke','backup','restore','prefix','rank','leaderboard','balance',
  'daily','work','shop','buy','afk','avatar','announce','botinfo','calc',
  'channelinfo','copychannel','copyserver','editsnipe','giveaway','invite',
  'membercount','paste','pasteserver','poll','remind','roleinfo','runservers',
  'servericon','serverinfo','snipe','steal','suggest','uptime','userinfo',
  'aimode','aimodeon','aimodeoff','chillmode','roastmode','casualmode',
  'mathmode','englishmode','codemode','sciencemode','setverify','verify',
  'move','createcmd','editcmd','deletecmd','listcmds','setairole',
]);

module.exports = {
  name: 'createcmd',
  description: 'Create a custom server command',
  aliases: ['addcmd', 'newcmd', 'editcmd', 'deletecmd', 'listcmds'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('createcmd')
      .setDescription('Create, edit, delete, or list custom server commands')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s => s.setName('create')
        .setDescription('Create a new custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name (no prefix)').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('What the bot replies').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Short description (optional)').setRequired(false)))
      .addSubcommand(s => s.setName('edit')
        .setDescription('Edit an existing custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('New response').setRequired(true)))
      .addSubcommand(s => s.setName('delete')
        .setDescription('Delete a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true)))
      .addSubcommand(s => s.setName('list')
        .setDescription('List all custom commands in this server')),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Server** to manage custom commands.')] });

    const guildId = source.guild.id;
    const pfx     = getPrefix(guildId);

    // Determine subcommand
    let sub, cmdName, response, desc;
    if (isSlash) {
      sub      = source.options.getSubcommand();
      cmdName  = source.options.getString('name')?.toLowerCase().trim();
      response = source.options.getString('response');
      desc     = source.options.getString('description') ?? '';
    } else {
      // prefix: ?createcmd <name> <response...>  OR  ?editcmd / ?deletecmd / ?listcmds
      const invoked = source.content.slice(1).trim().split(/\s+/)[0].toLowerCase();
      if (invoked === 'editcmd')   sub = 'edit';
      else if (invoked === 'deletecmd') sub = 'delete';
      else if (invoked === 'listcmds')  sub = 'list';
      else sub = 'create';

      if (sub !== 'list') {
        cmdName  = args.shift()?.toLowerCase();
        response = args.join(' ');
        desc     = '';
      }
    }

    if (sub === 'list') {
      const cmds = customcmds.getAll(guildId);
      const entries = Object.entries(cmds);
      if (!entries.length)
        return reply({ embeds: [info(client, '📋 Custom Commands', [], `No custom commands yet.\nUse \`${pfx}createcmd <name> <response>\` to make one.`)] });

      const lines = entries.map(([n, d]) => `\`${pfx}${n}\` — ${d.description || d.response.slice(0, 60)}`);
      const embed = base(client)
        .setTitle(`📋 Custom Commands (${entries.length})`)
        .setDescription(`${SEP}\n${lines.join('\n')}\n${SEP}`);
      return reply({ embeds: [embed] });
    }

    if (!cmdName) return reply({ embeds: [error(client, 'Missing Name', `Provide a command name.`)] });

    if (sub === 'create' || sub === 'edit') {
      if (!response?.trim()) return reply({ embeds: [error(client, 'Missing Response', 'Provide a response for the command.')] });
      if (sub === 'create' && RESERVED.has(cmdName))
        return reply({ embeds: [error(client, 'Reserved Name', `\`${cmdName}\` is a built-in command name.`)] });
      if (sub === 'create' && customcmds.get(guildId, cmdName))
        return reply({ embeds: [error(client, 'Already Exists', `\`${pfx}${cmdName}\` already exists. Use \`${pfx}editcmd ${cmdName} <new response>\` to update it.`)] });

      customcmds.set(guildId, cmdName, {
        response: response.trim(),
        description: desc,
        createdBy: source.user?.id ?? source.author?.id,
        createdAt: Date.now(),
      });

      return reply({ embeds: [success(client, sub === 'create' ? '✅ Command Created' : '✏️ Command Updated',
        `\`${pfx}${cmdName}\` is ready.\n**Response:** ${response.trim().slice(0, 200)}`)] });
    }

    if (sub === 'delete') {
      if (!customcmds.get(guildId, cmdName))
        return reply({ embeds: [error(client, 'Not Found', `\`${pfx}${cmdName}\` doesn't exist.`)] });
      customcmds.remove(guildId, cmdName);
      return reply({ embeds: [success(client, '🗑️ Command Deleted', `\`${pfx}${cmdName}\` removed.`)] });
    }
  },
};

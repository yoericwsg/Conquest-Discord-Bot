const { SlashCommandBuilder } = require('discord.js');
const { panel, base, SEP } = require('../../utils/embed');
const { getPrefix } = require('../../utils/prefix');

const CATEGORIES = {
  '⚙️ Config':       ['prefix', 'setlog', 'setwelcome', 'setleave', 'autorole', 'setairole', 'setverify', 'setserverinvite', 'setemergencyroles'],
  '🔨 Moderation':   ['ban', 'kick', 'timeout', 'unban', 'purge', 'lock', 'unlock', 'slowmode', 'nick', 'softban', 'roleadd', 'roleremove', 'move'],
  '🧠 Optional AI':   ['aimodeon', 'aimodeoff', 'chillmode', 'roastmode', 'casualmode', 'mathmode', 'englishmode', 'codemode', 'sciencemode', 'gfmode', 'buildmode', 'servermode', 'aimode reset'],
  '🛠️ Utility':      ['ping', 'uptime', 'runservers', 'servers', 'botinfo', 'userinfo', 'serverinfo', 'serversin', 'checkservers', 'forcegeninvite', 'changelogs', 'antiraid', 'earlyaccess', 'bypassroleadd', 'announce', 'downtime', 'downtimeby', 'lockdown', 'cancellockdown', 'lockdownmode', 'ticketpanel', 'installembedemoji', 'avatar', 'roleinfo', 'channelinfo', 'membercount', 'invite', 'poll', 'calc', 'createcmd', 'editcmd', 'deletecmd', 'listcmds', 'embed', 'password', 'reversetext (/reverse)', 'emojis', 'timestamp', 'imgtogif', 'status', 'templates', 'serverbuild', 'setverify', 'verifyoff', 'raidstart', 'raidend'],
  '⭐ Leveling':     ['rank', 'leaderboard'],
  '💰 Economy':      ['balance', 'daily', 'work', 'shop', 'buy'],
  '🎲 Fun':          ['8ball', 'coinflip', 'meme', 'joke', 'rps', 'dice', 'choose', 'wyr', 'rate', 'hug', 'slap', 'truth', 'dare', 'howgay'],
  '🎫 Tickets':      ['ticketpanel (admin setup)'],
  '💾 Backup':       ['backup', 'restore'],
};

module.exports = {
  name: 'help',
  description: 'Show all commands',
  aliases: ['h', 'commands', 'cmds'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show all unitClan commands')
      .addStringOption(o => o.setName('category').setDescription('Category to view').addChoices(
        { name: 'Config', value: 'config' },
        { name: 'Moderation', value: 'moderation' },
        { name: 'Utility', value: 'utility' },
        { name: 'Fun', value: 'fun' },
        { name: 'Economy', value: 'economy' },
        { name: 'Leveling', value: 'leveling' },
      )),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const pfx     = getPrefix(source.guild?.id);

    const lines = [
      `**unitClan ${require('../../config.json').version}** — Discord moderation and community tools`,
      `Prefix: \`${pfx}\`  ·  Many commands also support \`/\` slash commands`,
      '`serversin`, `checkservers`, `forcegeninvite`, `changelogs`, `antiraid`, `earlyaccess`, `bypassroleadd`, `announce`, `downtime`, and `downtimeby` are application-owner/team DM-only commands. `lockdown`, `cancellockdown`, and `lockdownmode` require Administrator permissions. `serverbuild`, `setverify`, `raidstart`, and `raidend` require Manage Server. `?installembedemoji` installs the six-icon core set; use `?installembedemoji full` for the 102-symbol pack. Both require Manage Expressions permission and available emoji slots.',
      SEP,
    ];

    for (const [cat, cmds] of Object.entries(CATEGORIES)) {
      lines.push(`${cat}`);
      lines.push(cmds.map(c => `\`${c}\``).join(', '));
      lines.push('');
    }

    lines.push(SEP);
    lines.push('Custom embeds support GIFs: `?embed Title | Description | https://...gif` or `/embed image_url:`.');
    lines.push(`Loaded: **${client.prefixCommands.size} prefix** · **${client.commands.size} slash** commands`);
    lines.push(`Use \`${pfx}<command>\` or \`/<command>\` to run any command.`);

    const embed = base(client)
      .setTitle('📖  unitClan Help')
      .setDescription(lines.join('\n'));

    await reply({ embeds: [embed] });
  },
};


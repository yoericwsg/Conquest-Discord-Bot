const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { getPrefix, setPrefix } = require('../../utils/prefix');

module.exports = {
  name: 'prefix',
  description: 'View or change the server command prefix',
  aliases: ['setprefix'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('prefix')
      .setDescription('View or change the server command prefix')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption(o => o.setName('new').setDescription('New prefix (1–3 characters)')),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply    = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const guildId  = source.guild.id;
    const current  = getPrefix(guildId);
    const newPfx   = isSlash ? source.options.getString('new') : args[0];

    if (!newPfx) {
      return reply({ embeds: [success(client, 'Server Prefix', `Current prefix: \`${current}\`\n\nChange it with \`${current}prefix <new>\` or \`/prefix new:<new>\`.`)] });
    }
    if (!source.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Server** permission.')], ephemeral: true });
    }
    if (newPfx.length > 3) {
      return reply({ embeds: [error(client, 'Too Long', 'Prefix must be 1–3 characters.')], ephemeral: true });
    }

    setPrefix(guildId, newPfx);
    await reply({ embeds: [success(client, '✅ Prefix Updated', `Server prefix changed to \`${newPfx}\`\nExample: \`${newPfx}help\``)] });
  },
};

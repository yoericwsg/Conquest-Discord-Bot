const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, panel } = require('../../utils/embed');
const backupSys = require('../../systems/backup');

module.exports = {
  name: 'backup',
  description: 'Create or list server backups',
  aliases: [],
  cooldown: 30,
  slash: {
    data: new SlashCommandBuilder()
      .setName('backup')
      .setDescription('Create or list server backups')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub.setName('create').setDescription('Create a new backup'))
      .addSubcommand(sub => sub.setName('list').setDescription('List existing backups')),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator** permission.')], ephemeral: true });
    }

    const sub = isSlash ? source.options.getSubcommand() : (args[0] ?? 'create');

    if (sub === 'create') {
      if (isSlash) await source.deferReply();
      else await source.channel.send('Creating backup...');

      try {
        const { filename, backup } = await backupSys.createBackup(source.guild);
        const embed = success(client, '✅  Backup Created',
          `Backup saved as \`${filename}\`\n\n` +
          `📋  **Roles:** ${backup.roles.length}\n` +
          `📁  **Channels:** ${backup.channels.length}\n` +
          `📅  **Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
        );
        isSlash ? source.editReply({ embeds: [embed] }) : source.channel.send({ embeds: [embed] });
      } catch (e) {
        const opts = { embeds: [error(client, 'Backup Failed', e.message)] };
        isSlash ? source.editReply(opts) : source.channel.send(opts);
      }
    } else if (sub === 'list') {
      const backups = backupSys.listBackups(source.guild.id);
      if (!backups.length) return reply({ embeds: [error(client, 'No Backups', 'No backups found for this server.')], ephemeral: true });

      const lines = backups.slice(0, 10).map((b, i) =>
        `**${i + 1}.** \`${b.filename}\`\n  📅 ${b.createdAt.substring(0, 10)} · ${b.roles} roles · ${b.channels} channels`
      );
      await reply({ embeds: [panel(client, '📦  Server Backups', lines)] });
    }
  },
};

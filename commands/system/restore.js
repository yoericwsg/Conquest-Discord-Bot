const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, warning } = require('../../utils/embed');
const backupSys = require('../../systems/backup');

module.exports = {
  name: 'restore',
  description: 'Restore a server backup',
  aliases: [],
  cooldown: 60,
  slash: {
    data: new SlashCommandBuilder()
      .setName('restore')
      .setDescription('Restore a server backup')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o => o.setName('filename').setDescription('Backup filename (from ?backup list)').setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator** permission.')], ephemeral: true });
    }

    const filename = isSlash ? source.options.getString('filename') : args[0];
    if (!filename) return reply({ embeds: [error(client, 'No Filename', 'Provide a backup filename. Use `?backup list`.')], ephemeral: true });

    await reply({ embeds: [warning(client, '⚠️  Restoring Backup', `Restoring \`${filename}\`...\nThis may take a moment.`)] });

    try {
      const result = await backupSys.restoreBackup(source.guild, filename);
      if (!result.success) {
        return source.channel.send({ embeds: [error(client, 'Restore Failed', result.reason)] });
      }

      const { results } = result;
      const errSummary = results.errors.length > 0 ? `\n\n⚠️  **${results.errors.length} error(s):** ${results.errors.slice(0, 3).join(', ')}` : '';

      await source.channel.send({
        embeds: [success(client, '✅  Backup Restored',
          `Restore complete!\n\n` +
          `✅  **Roles recreated:** ${results.roles}\n` +
          `✅  **Channels recreated:** ${results.channels}` +
          errSummary
        )],
      });
    } catch (e) {
      await source.channel.send({ embeds: [error(client, 'Restore Error', e.message)] });
    }
  },
};

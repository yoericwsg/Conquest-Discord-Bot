const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { createServerFromTemplate } = require('../../systems/server-builder');

module.exports = {
  name: 'setupserver',
  description: 'Create a complete server operations layout',
  aliases: ['fullsetup', 'serverinit', 'setup'],
  cooldown: 30,
  slash: {
    data: new SlashCommandBuilder()
      .setName('setupserver')
      .setDescription('Create staff, operations, business, community, and voice channels')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  },
  async execute(source) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const respond = options => {
      if (!isSlash) return source.channel.send({ content: options.content, embeds: options.embeds });
      const { ephemeral, ...payload } = options;
      if (source.deferred) return source.editReply(payload);
      return source.reply({ ...payload, flags: MessageFlags.Ephemeral });
    };
    if (!source.guild) return respond({ content: 'Run this command inside the server you want to set up.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return respond({ content: 'You need **Administrator** permission to run the full server setup.', ephemeral: true });
    }
    if (isSlash) await source.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await createServerFromTemplate(source.guild, 'server');
      const lines = [
        `Created **${result.created.length}** item(s); left **${result.skipped.length}** existing item(s) untouched.`,
        '',
        result.created.length ? `**Created:** ${result.created.slice(0, 36).join(', ')}` : '**Created:** nothing new',
      ];
      if (result.skipped.length) lines.push(`**Already there:** ${result.skipped.slice(0, 18).join(', ')}`);
      if (result.failed.length) lines.push(`**Could not create:** ${result.failed.slice(0, 12).join('; ')}`);
      lines.push('', 'The layout only adds missing roles and channels. It does not delete or rename existing server items.');
      return respond({
        embeds: [new EmbedBuilder().setColor(result.failed.length ? '#FEE75C' : '#57F287').setTitle('Server setup complete').setDescription(lines.join('\n'))],
        ephemeral: true,
      });
    } catch (error) {
      return respond({ content: `Could not build the server layout: ${error.message}`, ephemeral: true });
    }
  },
};


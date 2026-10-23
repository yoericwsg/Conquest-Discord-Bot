const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { createServerFromTemplate } = require('../../systems/server-builder');

module.exports = {
  name: 'clansetup',
  description: 'Create a complete clan server layout',
  aliases: ['setupclan', 'clanserver'],
  cooldown: 20,
  slash: {
    data: new SlashCommandBuilder()
      .setName('clansetup')
      .setDescription('Create clan, raid, activity, and partnership channels')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  },
  async execute(source) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const respond = options => {
      if (!isSlash) return source.channel.send({ content: options.content, embeds: options.embeds });
      const { ephemeral, ...payload } = options;
      if (source.deferred) return source.editReply(payload);
      return source.reply({ ...payload, flags: MessageFlags.Ephemeral });
    };
    if (!source.guild) return respond({ content: 'Run this command inside the clan server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return respond({ content: 'You need **Manage Server** permission to run clan setup.', ephemeral: true });
    }
    if (isSlash) await source.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await createServerFromTemplate(source.guild, 'clan');
      const lines = [
        `Created **${result.created.length}** item(s); left **${result.skipped.length}** existing item(s) untouched.`,
        '',
        result.created.length ? `**Created:** ${result.created.slice(0, 30).join(', ')}` : '**Created:** nothing new',
      ];
      if (result.skipped.length) lines.push(`**Already there:** ${result.skipped.slice(0, 16).join(', ')}`);
      if (result.failed.length) lines.push(`**Could not create:** ${result.failed.slice(0, 10).join('; ')}`);
      lines.push('', 'Raid operations are ready for `?raidstart <roblox_username> [ping] [server_link]` or `/raidstart`.');
      return respond({
        embeds: [new EmbedBuilder().setColor(result.failed.length ? '#FEE75C' : '#57F287').setTitle('Clan HQ setup complete').setDescription(lines.join('\n'))],
        ephemeral: true,
      });
    } catch (error) {
      return respond({ content: `Could not build the clan layout: ${error.message}`, ephemeral: true });
    }
  },
};


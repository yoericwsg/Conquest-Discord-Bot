const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { TEMPLATES, createServerFromTemplate } = require('../../systems/server-builder');

const TEMPLATE_CHOICES = Object.entries(TEMPLATES).map(([value, template]) => ({
  name: template.label,
  value,
}));

module.exports = {
  name: 'serverbuild',
  description: 'Build a server layout from a template',
  aliases: ['buildserver', 'servertemplate'],
  cooldown: 15,
  slash: {
    data: new SlashCommandBuilder()
      .setName('serverbuild')
      .setDescription('Create a starter Discord server layout')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption(option => option
        .setName('template')
        .setDescription('Choose a starter server layout')
        .setRequired(true)
        .addChoices(...TEMPLATE_CHOICES)),
  },
  async execute(source, args) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const respond = options => {
      if (!isSlash) return source.channel.send({ content: options.content, embeds: options.embeds });
      const { ephemeral, ...payload } = options;
      if (source.deferred) return source.editReply(payload);
      return source.reply({ ...payload, flags: MessageFlags.Ephemeral });
    };
    const member = source.member;

    if (!member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return respond({
        content: 'You need **Manage Server** permission to build a server layout.',
        ephemeral: true,
      });
    }

    const templateKey = isSlash
      ? source.options.getString('template')
      : String(args[0] ?? '').toLowerCase();

    if (!TEMPLATES[templateKey]) {
      const choices = Object.entries(TEMPLATES)
        .map(([key, value]) => `\`${key}\` — ${value.description}`)
        .join('\n');
      return respond({
        embeds: [new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('Choose a server template')
          .setDescription(`${choices}\n\nExample: \`?serverbuild gaming\``)],
        ephemeral: true,
      });
    }

    if (isSlash) await source.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await createServerFromTemplate(source.guild, templateKey);
      const lines = [
        `Created **${result.created.length}** item(s); left **${result.skipped.length}** existing item(s) untouched.`,
        '',
        result.created.length ? `**Created:** ${result.created.slice(0, 24).join(', ')}` : '**Created:** nothing new',
      ];
      if (result.skipped.length) lines.push(`**Already there:** ${result.skipped.slice(0, 12).join(', ')}`);
      if (result.failed.length) {
        lines.push(`**Could not create:** ${result.failed.slice(0, 8).join('; ')}`);
      }
      lines.push('', 'This only adds missing channels and roles. It does not delete or edit existing server items.');

      return respond({
        embeds: [new EmbedBuilder()
          .setColor(result.failed.length ? '#FEE75C' : '#57F287')
          .setTitle(`${result.template} server layout`)
          .setDescription(lines.join('\n'))],
        ephemeral: true,
      });
    } catch (error) {
      return respond({
        content: `Could not build the layout: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};

const { SlashCommandBuilder, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { panel } = require('../../utils/embed');

module.exports = {
  name: 'invite',
  description: 'Get the bot invite link',
  aliases: ['addbot', 'invitebot'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('invite').setDescription('Get a least-privilege or feature-specific unitClan invite')
    .addStringOption(option => option.setName('permissions').setDescription('Optional permission bundle').addChoices(
      { name: 'Core only (recommended)', value: 'core' },
      { name: 'Moderation', value: 'moderation' },
      { name: 'Server setup', value: 'setup' },
      { name: 'All features', value: 'full' },
    )) },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const preset = (isSlash ? source.options.getString('permissions') : args[0])?.toLowerCase() || 'core';
    const bundles = {
      core: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.UseApplicationCommands,
      ],
      moderation: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.UseApplicationCommands,
        PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers,
      ],
      setup: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.UseApplicationCommands,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles,
      ],
      full: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageEvents,
        PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak, PermissionFlagsBits.CreateInstantInvite, PermissionFlagsBits.ManageGuildExpressions,
      ],
    };
    if (!bundles[preset]) {
      return reply({ content: 'Choose `core`, `moderation`, `setup`, or `full`. The default `core` bundle is recommended.' });
    }

    const link = client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: bundles[preset],
    });

    await reply({
      embeds: [panel(client, `🔗  Invite unitClan · ${preset}`, [
        `[**Click here to invite me**](${link})`,
        ``,
        preset === 'core'
          ? 'Recommended: starts with basic messaging and slash-command permissions. Add permissions later only for features you choose to enable.'
          : `This optional ${preset} bundle grants additional server permissions. Review the Discord authorization screen before approving it.`,
        'No bundle grants Administrator permission.',
      ])],
    });
  },
};


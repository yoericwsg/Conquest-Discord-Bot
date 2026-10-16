const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { error, success } = require('../../utils/embed');
const { createTicketPanel } = require('../../systems/tickets');

module.exports = {
  name: 'ticketpanel',
  description: 'Post a support ticket panel in a server channel',
  aliases: ['ticketsetup', 'settickets'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder()
    .setName('ticketpanel').setDescription('Post a support ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('Where to post the panel')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)) },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const member = source.member;
    const target = isSlash ? source.options.getChannel('channel') ?? source.channel
      : source.mentions.channels.first() ?? source.channel;
    const reply = payload => isSlash ? source.reply(payload) : source.reply(payload);
    if (!source.guild) return reply({ content: 'Ticket panels can only be set up inside a server.' });
    if (!member?.permissions?.has(PermissionFlagsBits.ManageChannels))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels** to post a ticket panel.')] });
    const botMember = source.guild.members.me ?? await source.guild.members.fetch(client.user.id).catch(() => null);
    const permissions = botMember && target.permissionsFor(botMember);
    if (!permissions?.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks))
      return reply({ embeds: [error(client, 'Missing permissions', 'I need **Send Messages** and **Embed Links** in the target channel.')] });
    try {
      await createTicketPanel(target, client);
      return reply({ embeds: [success(client, 'Ticket panel posted', `Support panel posted in ${target}.`)] });
    } catch (err) {
      return reply({ embeds: [error(client, 'Could not post panel', err.message)] });
    }
  },
};

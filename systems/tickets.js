const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const { success, error, panel } = require('../utils/embed');
const storage = require('../utils/storage');

async function createTicketPanel(channel, client) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('📩  Open a Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = panel(client, '🎫  Support Tickets', [
    'Need help? Click the button below to open a private ticket.',
    '',
    '**Guidelines:**',
    '• Describe your issue clearly',
    '• Be respectful to staff',
    '• One ticket per issue',
  ]);

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleButton(interaction, client) {
  if (interaction.customId === 'ticket_create') {
    await createTicket(interaction, client);
  } else if (interaction.customId === 'ticket_close') {
    await closeTicket(interaction, client);
  }
}

async function createTicket(interaction, client) {
  const guild = interaction.guild;
  const user  = interaction.user;

  const existing = guild.channels.cache.find(c => c.topic === `conquest-ticket-owner:${user.id}`);
  if (existing) {
    await interaction.reply({ embeds: [error(client, 'Ticket Exists', `You already have an open ticket: ${existing}`)], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const configs  = storage.get('configs.json', guild.id, {});
    const category = configs.ticketCategory ? guild.channels.cache.get(configs.ticketCategory) : null;

    const slug = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'member';
    const channel = await guild.channels.create({
      name: `ticket-${slug}-${user.id.slice(-4)}`,
      type: ChannelType.GuildText,
      parent: category?.id ?? null,
      topic: `conquest-ticket-owner:${user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
      reason: `Ticket opened by ${user.tag}`,
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒  Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = panel(client, '🎫  Ticket Opened', [
      `Welcome, ${user}!`,
      '',
      'Describe your issue and a staff member will assist you shortly.',
      '',
      'Click **Close Ticket** when resolved.',
    ]);

    await channel.send({ content: `${user}`, embeds: [embed], components: [closeRow], allowedMentions: { users: [user.id] } });
    await interaction.editReply({ embeds: [success(client, 'Ticket Created', `Your ticket has been opened: ${channel}`)] });
  } catch (e) {
    await interaction.editReply({ embeds: [error(client, 'Failed', `Could not create ticket: ${e.message}`)] });
  }
}

async function closeTicket(interaction, client) {
  const channel = interaction.channel;
  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ embeds: [error(client, 'Invalid', 'This is not a ticket channel.')], ephemeral: true });
    return;
  }

  const openerOverwrite = channel.permissionOverwrites.cache.get(interaction.user.id);
  const isOwner = channel.topic === `conquest-ticket-owner:${interaction.user.id}` ||
    (!channel.topic && openerOverwrite?.allow.has(PermissionFlagsBits.ViewChannel));
  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isOwner && !isStaff) {
    await interaction.reply({ embeds: [error(client, 'Not your ticket', 'Only the ticket opener or server staff can close this ticket.')], ephemeral: true });
    return;
  }
  const botMember = channel.guild.members.me ?? await channel.guild.members.fetch(client.user.id).catch(() => null);
  if (!botMember?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ embeds: [error(client, 'Missing permission', 'I need **Manage Channels** to close this ticket.')], ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [panel(client, '🔒  Closing Ticket', ['This ticket will be deleted in **5 seconds**...'])] });
  const timer = setTimeout(() => channel.delete(`Ticket closed by ${interaction.user.tag}`).catch(() => null), 5000);
  timer.unref?.();
}

module.exports = { createTicketPanel, handleButton, createTicket, closeTicket };

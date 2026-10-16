const {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ComponentType,
} = require('discord.js');
const { warning, success, error, panel } = require('../../utils/embed');

module.exports = {
  name: 'nuke',
  description: 'Clone this channel (wiping all messages) — same position, topic, perms',
  aliases: [],
  cooldown: 30,
  slash: {
    data: new SlashCommandBuilder()
      .setName('nuke')
      .setDescription('Wipe all messages by cloning + deleting this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const channel  = source.channel;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels**.')] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nuke_yes').setLabel('💣  Nuke It').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('nuke_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await reply({
      embeds: [warning(client, '💣  Confirm Nuke',
        `This will **delete all messages** in <#${channel.id}> by cloning it.\nThe channel will reappear at the same position with the same settings.`)],
      components: [row],
      fetchReply: true,
    });

    const userId = isSlash ? source.user.id : source.author.id;

    const collector = confirmMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId,
      time: 20_000,
      max: 1,
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate().catch(() => {});

      if (interaction.customId !== 'nuke_yes') {
        await confirmMsg.edit({ embeds: [error(client, 'Cancelled', 'Nuke aborted.')], components: [] }).catch(() => {});
        return;
      }

      try {
        const cloned = await channel.clone({ reason: `Nuke by ${interaction.user.tag}` });
        await cloned.setPosition(channel.position, { reason: 'Nuke — restore position' });
        await channel.delete(`Nuke by ${interaction.user.tag}`);
        await cloned.send({ embeds: [success(client, '💣  Channel Nuked',
          `This channel was nuked by **${interaction.user.tag}**.`)] });
      } catch (e) {
        await confirmMsg.edit({ embeds: [error(client, 'Failed', e.message)], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await confirmMsg.edit({ components: [] }).catch(() => {});
      }
    });
  },
};

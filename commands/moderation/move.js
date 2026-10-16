const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  name: 'move',
  description: 'Move a member to a voice channel',
  aliases: ['vmove', 'drag'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('move')
      .setDescription('Move a member to a voice channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
      .addUserOption(o => o.setName('user').setDescription('User to move').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target voice channel (leave empty = your current VC)').setRequired(false)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!source.member.permissions.has(PermissionFlagsBits.MoveMembers))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Move Members** to use this.')] });

    let targetMember, targetChannel;

    if (isSlash) {
      const user = source.options.getUser('user');
      targetMember  = await source.guild.members.fetch(user.id).catch(() => null);
      targetChannel = source.options.getChannel('channel');
    } else {
      targetMember = source.mentions.members.first();
      if (!targetMember) return reply({ embeds: [error(client, 'No User', 'Mention a user to move.')] });

      // Try to find channel by name from args (skip mention tokens)
      const nameArg = args.filter(a => !a.startsWith('<')).join(' ').toLowerCase();
      if (nameArg) {
        const { ChannelType } = require('discord.js');
        targetChannel = source.guild.channels.cache.find(
          c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes(nameArg)
        );
        if (!targetChannel) return reply({ embeds: [error(client, 'Channel Not Found', `No voice channel matching \`${nameArg}\`.`)] });
      }
    }

    if (!targetMember) return reply({ embeds: [error(client, 'User Not Found', 'Could not find that user.')] });
    if (!targetMember.voice.channel)
      return reply({ embeds: [error(client, 'Not in Voice', `**${targetMember.displayName}** is not in a voice channel.`)] });

    // Default to executor's voice channel if no target channel provided
    if (!targetChannel) {
      targetChannel = source.member.voice.channel;
      if (!targetChannel)
        return reply({ embeds: [error(client, 'No Target', 'Specify a channel or join a voice channel first.')] });
    }

    const { ChannelType } = require('discord.js');
    if (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice)
      return reply({ embeds: [error(client, 'Wrong Channel Type', 'Target must be a voice channel.')] });

    try {
      await targetMember.voice.setChannel(targetChannel);
      return reply({ embeds: [success(client, '🔀 Member Moved', `**${targetMember.displayName}** → **${targetChannel.name}**`)] });
    } catch (e) {
      return reply({ embeds: [error(client, 'Move Failed', e.message)] });
    }
  },
};

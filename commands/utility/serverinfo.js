const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { info } = require('../../utils/embed');

module.exports = {
  name: 'serverinfo',
  description: 'Display information about the server',
  aliases: ['si', 'guild'],
  cooldown: 10,
  slash: { data: new SlashCommandBuilder().setName('serverinfo').setDescription('Display information about the server') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const guild   = source.guild;
    if (!guild) return reply({ content: 'Server only command.', ephemeral: true });

    await guild.fetch();
    const owner   = await guild.fetchOwner();
    const text    = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voice   = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const bots    = guild.members.cache.filter(m => m.user.bot).size;
    const humans  = guild.memberCount - bots;

    await reply({
      embeds: [info(client, `🌐  ${guild.name}`, [
        { name: 'Owner',        value: `${owner.user.tag}`,                                         inline: true },
        { name: 'ID',           value: guild.id,                                                    inline: true },
        { name: 'Created',      value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,        inline: true },
        { name: 'Members',      value: `${guild.memberCount} (${humans} humans, ${bots} bots)`,      inline: true },
        { name: 'Boost Level',  value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0} boosts)`, inline: true },
        { name: 'Channels',     value: `${text} text · ${voice} voice`,                            inline: true },
        { name: 'Roles',        value: `${guild.roles.cache.size - 1}`,                             inline: true },
        { name: 'Verification', value: `${guild.verificationLevel}`,                               inline: true },
      ]).setThumbnail(guild.iconURL({ size: 256 }))],
    });
  },
};

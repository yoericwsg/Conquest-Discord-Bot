const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { base } = require('../../utils/embed');

module.exports = {
  name: 'servericon',
  description: 'Show the server icon (+ download button)',
  aliases: ['sicon', 'guildicon', 'icon'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('servericon')
      .setDescription('Show the server icon with download links'),
  },
  async execute(source, args, client) {
    const guild  = source.guild;
    const iconURL = guild.iconURL({ size: 4096, extension: 'png' });

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!iconURL)
      return reply({ content: '❌ This server has no icon.' });

    const embed = base(client)
      .setColor('#5865F2')
      .setTitle(`${guild.name} — Server Icon`)
      .setImage(iconURL)
      .setFooter({ text: `Server ID: ${guild.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'png' })),
      new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'jpg' })),
      guild.icon?.startsWith('a_')
        ? new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'gif' }))
        : null,
      new ButtonBuilder().setLabel('WebP').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'webp' })),
    ).toJSON ? new ActionRowBuilder().addComponents(
        ...[
          new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'png' })),
          new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'jpg' })),
          guild.icon?.startsWith('a_') ? new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'gif' })) : null,
          new ButtonBuilder().setLabel('WebP').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'webp' })),
        ].filter(Boolean)
      ) : new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'png' })),
        new ButtonBuilder().setLabel('WebP').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'webp' })),
      );

    const buttons = new ActionRowBuilder().addComponents(
      ...[
        new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'png' })),
        new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'jpg' })),
        guild.icon?.startsWith('a_') ? new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'gif' })) : null,
        new ButtonBuilder().setLabel('WebP').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 4096, extension: 'webp' })),
      ].filter(Boolean)
    );

    return reply({ embeds: [embed], components: [buttons] });
  },
};

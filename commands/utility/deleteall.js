const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'deleteall',
  description: 'Replace every server channel after explicit confirmation',
  aliases: ['wipechannels'],
  cooldown: 60,
  slash: { data: new SlashCommandBuilder().setName('deleteall').setDescription('Delete all channels after explicit confirmation').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('confirmation').setDescription('Type DELETE-ALL').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason for the reset')) },
  async execute(source, args) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply({ ...payload, flags: MessageFlags.Ephemeral }) : source.channel.send(payload);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.Administrator)) return reply({ content: 'You need **Administrator** permission.', ephemeral: true });
    const confirmation = isSlash ? source.options.getString('confirmation') : args[0];
    const reason = isSlash ? source.options.getString('reason') : args.slice(1).join(' ');
    if (String(confirmation).toUpperCase() !== 'DELETE-ALL') return reply({ content: 'This action is destructive. Type `?deleteall DELETE-ALL <reason>` to confirm.', ephemeral: true });
    await reply({ content: 'Deleting server channels and creating the replacement channel…', ephemeral: true });
    const channels = await source.guild.channels.fetch();
    for (const channel of channels.values()) await channel.delete(`unitClan deleteall: ${reason || 'server reset'}`).catch(() => null);
    const created = await source.guild.channels.create({ name: 'server-reset', type: ChannelType.GuildText, topic: 'Replacement channel created by unitClan deleteall' });
    const embed = new EmbedBuilder().setColor('#ED4245').setTitle('🔒 Server reset').setDescription('All channels were removed by ' + (source.user ?? source.author) + '.\\n\\n**Reason:** ' + (reason || 'Not provided') + '\\n\\nUse ?setupserver or ?clansetup to rebuild the layout.').setTimestamp();
    await created.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
  },
};




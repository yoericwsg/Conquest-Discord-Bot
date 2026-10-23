const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'createrules',
  description: 'Create a polished rules channel and embed',
  aliases: ['rulesetup', 'rules'],
  cooldown: 20,
  slash: { data: new SlashCommandBuilder().setName('createrules').setDescription('Create an advanced rules embed').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addChannelOption(o => o.setName('channel').setDescription('Rules channel').addChannelTypes(ChannelType.GuildText)).addStringOption(o => o.setName('rules').setDescription('Optional rules separated with |').setMaxLength(1800)) },
  async execute(source, args) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply = payload => isSlash ? source.reply({ ...payload, flags: MessageFlags.Ephemeral }) : source.channel.send(payload);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) return reply({ content: 'You need **Manage Channels** permission.', ephemeral: true });
    const channel = isSlash ? (source.options.getChannel('channel') ?? source.channel) : source.channel;
    if (!channel?.isTextBased?.()) return reply({ content: 'Choose a text channel.', ephemeral: true });
    const raw = isSlash ? source.options.getString('rules') : args.join(' ');
    const rules = (raw ? raw.split('|') : ['Respect every member and keep discussions constructive.', 'No spam, harassment, scams, or unsafe links.', 'Use the correct channels and follow staff directions.', 'Keep raids, events, and partnerships organized.', 'Report issues privately to the staff team.']).map(item => item.trim()).filter(Boolean).slice(0, 10);
    const embed = new EmbedBuilder().setColor('#377DFF').setTitle('📘  Server Rules').setDescription('Read these before participating. By staying in the server, you agree to follow them.').addFields(rules.map((rule, index) => ({ name: `${['🛡️', '💬', '📌', '⚔️', '🤝', '🔒', '✨', '🚦', '🧭', '✅'][index]} Rule ${index + 1}`, value: rule }))).setFooter({ text: 'unitClan • keep the server clean, active, and welcoming' }).setTimestamp();
    await channel.send({ embeds: [embed] });
    return isSlash ? source.editReply({ content: `Rules posted in ${channel}.` }) : null;
  },
};



const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ChannelType } = require('discord.js');
const ICONS = { welcome: '👋', rules: '📜', announcements: '📢', verify: '✅', general: '💬', chat: '💬', staff: '🛡️', operations: '⚙️', activity: '📊', reports: '🚨', raid: '⚔️', partner: '🤝', business: '💼', projects: '📁', resources: '📚', events: '📅', media: '🎬', voice: '🔊', lobby: '🎯', plans: '🗺️', results: '🏆', suggestions: '💡', polls: '🗳️', afk: '💤' };
function iconFor(channel) { const key = channel.name.toLowerCase(); return Object.entries(ICONS).find(([word]) => key.includes(word))?.[1] ?? (channel.type === ChannelType.GuildVoice ? '🔊' : channel.type === ChannelType.GuildCategory ? '📂' : '💬'); }
function prefixed(name, icon) { const clean = name.replace(/^[^\x00-\x7F]+\s*/u, ''); return `${icon} ${clean}`.slice(0, 100); }
module.exports = {
  name: 'emojiadd', description: 'Add matching emojis to channel names', aliases: ['channelemojis', 'emojichannels'], cooldown: 15,
  slash: { data: new SlashCommandBuilder().setName('emojiadd').setDescription('Add matching emojis to channel names').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addStringOption(o => o.setName('scope').setDescription('Rename every channel or one channel').addChoices({ name: 'All channels', value: 'all' }, { name: 'Current channel', value: 'current' })) },
  async execute(source, args) {
    const slash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand(); const reply = p => slash ? source.reply({ ...p, flags: MessageFlags.Ephemeral }) : source.channel.send(p);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) return reply({ content: 'You need **Manage Channels** permission.', ephemeral: true });
    const scope = slash ? (source.options.getString('scope') ?? 'all') : String(args[0] ?? 'all').toLowerCase();
    const channels = scope === 'current' ? [source.channel] : [...source.guild.channels.cache.values()]; let changed = 0;
    for (const channel of channels) { if (!channel?.setName || channel.name.startsWith(iconFor(channel))) continue; await channel.setName(prefixed(channel.name, iconFor(channel)), 'unitClan emojiadd').then(() => changed++).catch(() => null); }
    return reply({ embeds: [new EmbedBuilder().setColor('#377DFF').setTitle('✨ Channel emojis added').setDescription(`Updated **${changed}** channel name(s). Existing emoji prefixes were preserved.`)] });
  },
};



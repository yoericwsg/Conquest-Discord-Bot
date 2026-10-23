const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const PROFILES = [
  { names: ['administrator', 'admin'], permissions: [PermissionFlagsBits.Administrator] },
  { names: ['head of operations', 'operations manager', 'general'], permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
  { names: ['deputy'], permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
  { names: ['agent'], permissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers] },
  { names: ['moderator', 'clan staff'], permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
  { names: ['raid lead'], permissions: [PermissionFlagsBits.ManageMessages] },
];
module.exports = {
  name: 'rolepermadd', description: 'Apply permission profiles to unitClan roles', aliases: ['roleperms', 'fixroleperms'], cooldown: 20,
  slash: { data: new SlashCommandBuilder().setName('rolepermadd').setDescription('Apply permission profiles to staff roles').setDefaultMemberPermissions(PermissionFlagsBits.Administrator) },
  async execute(source) {
    const slash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand(); const reply = p => slash ? source.reply({ ...p, flags: MessageFlags.Ephemeral }) : source.channel.send(p);
    if (!source.guild) return reply({ content: 'Run this command inside a server.', ephemeral: true });
    if (!source.member?.permissions?.has(PermissionFlagsBits.Administrator)) return reply({ content: 'You need **Administrator** permission.', ephemeral: true });
    let updated = 0, skipped = 0;
    for (const profile of PROFILES) for (const role of source.guild.roles.cache.values()) if (profile.names.includes(role.name.toLowerCase())) { if (role.managed || role.id === source.guild.id) { skipped++; continue; } await role.setPermissions(profile.permissions, 'unitClan rolepermadd').then(() => updated++).catch(() => null); }
    return reply({ embeds: [new EmbedBuilder().setColor('#5865F2').setTitle('🛡️ Role permissions updated').setDescription(`Applied permission profiles to **${updated}** role(s).\nSkipped **${skipped}** managed or protected role(s).`)] });
  },
};


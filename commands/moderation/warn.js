const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, panel, warning: warnEmbed, info } = require('../../utils/embed');
const storage = require('../../utils/storage');

const AUTO_MUTE_AT = 3;  // auto timeout at X warns
const AUTO_BAN_AT  = 5;  // auto ban at X warns
const MUTE_DURATION = 10 * 60 * 1000; // 10 minutes

module.exports = {
  name: 'warn',
  description: 'Warn a member — auto-mute at 3 warns, auto-ban at 5',
  aliases: ['w'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a member (auto-mute at 3, auto-ban at 5 warns)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild    = source.guild;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Moderate Members**.')] });

    const targetUser   = isSlash ? source.options.getUser('user') : source.mentions.users.first();
    const reason       = isSlash ? (source.options.getString('reason') ?? 'No reason provided') : args.slice(1).join(' ') || 'No reason provided';
    const moderatorTag = isSlash ? source.user.tag : source.author.tag;

    if (!targetUser)
      return reply({ embeds: [error(client, 'Missing User', 'Mention a member to warn.')] });

    const targetMember = guild.members.cache.get(targetUser.id) ?? await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember)
      return reply({ embeds: [error(client, 'Not Found', 'That member is not in this server.')] });

    if (targetMember.roles.highest.position >= member.roles.highest.position)
      return reply({ embeds: [error(client, 'Hierarchy', 'You cannot warn someone with an equal or higher role.')] });

    // Store warning
    const key = `${guild.id}:${targetUser.id}`;
    const warns = storage.get('warnings.json', key, []);
    warns.push({ reason, moderator: moderatorTag, timestamp: Date.now() });
    storage.set('warnings.json', key, warns);

    const count = warns.length;

    // DM the warned user
    try {
      await targetUser.send({ embeds: [warnEmbed(client, `⚠️  Warning in ${guild.name}`,
        `You have received a warning.\n**Reason:** ${reason}\n**Warns:** ${count}/${AUTO_BAN_AT}`)] });
    } catch {}

    // Auto actions
    let action = '';
    if (count >= AUTO_BAN_AT) {
      try {
        await guild.members.ban(targetUser, { reason: `Auto-ban: reached ${AUTO_BAN_AT} warnings` });
        action = `\n🔨 **Auto-banned** for reaching ${AUTO_BAN_AT} warnings.`;
      } catch (e) { action = `\n⚠️ Auto-ban failed: ${e.message}`; }
    } else if (count >= AUTO_MUTE_AT) {
      try {
        await targetMember.timeout(MUTE_DURATION, `Auto-timeout: reached ${AUTO_MUTE_AT} warnings`);
        action = `\n🔇 **Auto-timed out** for 10 minutes (reached ${AUTO_MUTE_AT} warnings).`;
      } catch (e) { action = `\n⚠️ Auto-timeout failed: ${e.message}`; }
    }

    return reply({ embeds: [success(client, '⚠️  Warning Issued',
      `**User:** ${targetUser.tag}\n**Reason:** ${reason}\n**Total warnings:** \`${count}/${AUTO_BAN_AT}\`${action}`)] });
  },
};

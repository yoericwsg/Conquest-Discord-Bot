const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');
const storage = require('../../utils/storage');
const { clearHistory } = require('../../systems/openrouter');

const FILE = 'aimode.json';

module.exports = {
  name: 'osintmode',
  description: 'Switch channel to OSINT intelligence investigation mode',
  aliases: ['osint', 'intelmode', 'reconmode'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('osintmode')
      .setDescription('Activate OSINT intelligence research mode in this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!isSlash && !source.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Channels** permission to toggle OSINT mode.')] });
    }

    const channelId = isSlash ? source.channelId : source.channel.id;
    const channelMention = `<#${channelId}>`;

    storage.set(FILE, channelId, { enabled: true, mode: 'osint' });
    clearHistory(channelId);

    const description = `${channelMention} is now locked in **🔍 OSINT Mode**.\n\n` +
      `**Capabilities:**\n` +
      `• Public intelligence & digital footprinting\n` +
      `• Search engine dorking syntax (Google, Shodan, Censys)\n` +
      `• Network & domain metadata analysis (DNS, WHOIS, SSL)\n` +
      `• OPSEC guidelines & investigation workflows\n` +
      `• Metadata & EXIF analysis techniques\n\n` +
      `*Conversation history refreshed. Ask any intelligence or reconnaissance question directly.*`;

    return reply({
      embeds: [success(client, '🔍 OSINT Intelligence Active', description)],
    });
  },
};

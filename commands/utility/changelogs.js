const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const { base } = require('../../utils/embed');
const { broadcastEmbed } = require('../../systems/announcement-delivery');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'changelogs',
  description: 'Post the latest or an older unitClan release note to announcement channels',
  aliases: ['changelog', 'release'],
  cooldown: 15,
  slash: {
    data: new SlashCommandBuilder()
      .setName('changelogs')
      .setDescription('Broadcast the latest or an older unitClan release note (owner/team DMs only)')
      .setContexts(InteractionContextType.BotDM)
      .addStringOption(option => option.setName('release').setDescription('latest, older, or a stored version').setRequired(false)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const sendText = text => isSlash ? source.reply({ content: text }) : source.reply(text);
    if (source.guild) return sendText('Run this command in unitClan’s DMs.');
    if (!await isApplicationOwner(client, actor.id))
      return sendText('This command is restricted to the verified unitClan owner/team.');

    let releases;
    try { releases = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/changelogs.json'), 'utf8')); }
    catch { return sendText('The release-notes file could not be read.'); }
    const requested = String((isSlash ? source.options.getString('release') : args.join(' ')) ?? 'latest').trim().toLowerCase() || 'latest';
    const index = requested === 'latest' ? 0
      : requested === 'older' || requested === 'old' ? 1
        : releases.findIndex(release => release.version.toLowerCase() === requested.replace(/^v/, ''));
    if (index < 0 || index >= releases.length) {
      const versions = releases.map(release => `\`${release.version}\``).join(', ');
      return sendText(`No stored release matches \`${requested}\`. Choose \`latest\`, \`older\`, or a version${versions ? `: ${versions}` : '.'}`);
    }

    const release = releases[index];
    const embed = base(client).setColor('#5865F2')
      .setTitle(`📋 unitClan ${release.version} changelog`)
      .setDescription(release.notes.map(note => {
        const text = String(note).trim();
        const marker = /^([+~−-])\s+/.exec(text);
        const sign = marker?.[1] === '~' ? '~' : marker && (marker[1] === '-' || marker[1] === '−') ? '−' : '+';
        return `**${sign}** ${marker ? text.slice(marker[0].length) : text}`;
      }).join('\n').slice(0, 3900))
      .setFooter({ text: `Released ${release.date} · posted by ${actor.tag ?? actor.username}` });
    const results = await broadcastEmbed(client, embed, `📋 **unitClan ${release.version} changelog**`);
    const sent = results.filter(result => result.sent).length;
    const skipped = results.length - sent;
    return sendText(`Posted **${release.version}** changelog to ${sent}/${results.length} servers.${skipped ? ` ${skipped} were skipped because an announcement/system channel or send permission was unavailable.` : ''}`);
  },
};


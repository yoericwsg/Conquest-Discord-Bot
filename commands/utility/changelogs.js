const { isApplicationOwner } = require('../../systems/owner-access');
const { base } = require('../../utils/embed');
const { broadcastEmbed } = require('../../systems/announcement-delivery');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'changelogs',
  description: 'Post the latest or an older Conquest release note to announcement channels',
  aliases: ['changelog', 'release'],
  cooldown: 15,
  async execute(source, args, client) {
    if (source.guild) return source.reply('Run this command in Conquest’s DMs.');
    if (!await isApplicationOwner(client, source.author.id))
      return source.reply('This command is restricted to the verified Conquest owner/team.');

    let releases;
    try { releases = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/changelogs.json'), 'utf8')); }
    catch { return source.reply('The release-notes file could not be read.'); }
    const requested = String(args[0] ?? 'latest').toLowerCase();
    const index = requested === 'latest' ? 0
      : requested === 'older' || requested === 'old' ? 1
        : releases.findIndex(release => release.version.toLowerCase() === requested.replace(/^v/, ''));
    if (index < 0 || index >= releases.length) {
      const versions = releases.map(release => `\`${release.version}\``).join(', ');
      return source.reply(`No stored release matches \`${requested}\`. Choose \`latest\`, \`older\`, or a version${versions ? `: ${versions}` : '.'}`);
    }

    const release = releases[index];
    const embed = base(client).setColor('#5865F2')
      .setTitle(`📋 Conquest ${release.version} changelog`)
      .setDescription(release.notes.map(note => {
        const text = String(note).trim();
        const marker = /^([+~−-])\s+/.exec(text);
        const sign = marker?.[1] === '~' ? '~' : marker && (marker[1] === '-' || marker[1] === '−') ? '−' : '+';
        return `**${sign}** ${marker ? text.slice(marker[0].length) : text}`;
      }).join('\n').slice(0, 3900))
      .setFooter({ text: `Released ${release.date} · posted by ${source.author.tag}` });
    const results = await broadcastEmbed(client, embed, `📋 **Conquest ${release.version} changelog**`);
    const sent = results.filter(result => result.sent).length;
    const skipped = results.length - sent;
    return source.channel.send(`Posted **${release.version}** changelog to ${sent}/${results.length} servers.${skipped ? ` ${skipped} were skipped because an announcement/system channel or send permission was unavailable.` : ''}`);
  },
};

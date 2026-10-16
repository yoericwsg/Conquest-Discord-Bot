const { isApplicationOwner } = require('../../systems/owner-access');
const { base } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'checkservers',
  description: 'Privately check Conquest server count and setup health',
  cooldown: 10,
  async execute(source, _args, client) {
    const actor = source.author;
    if (source.guild) return source.reply('Run this command in Conquest’s DMs.');
    if (!await isApplicationOwner(client, actor.id))
      return source.reply('This command is restricted to the verified Conquest owner/team.');

    const guilds = [...client.guilds.cache.values()].sort((a, b) => a.name.localeCompare(b.name));
    const pages = [];
    for (let index = 0; index < guilds.length; index += 10) {
      const chunk = guilds.slice(index, index + 10);
      const embed = base(client)
        .setTitle(`Conquest server health · ${guilds.length} servers`)
        .setDescription(chunk.length ? 'Private team report. Invite links are only shown when configured by a server administrator.' : 'Conquest is not currently in any servers.');
      for (const guild of chunk) {
        const configs = storage.get('configs.json', guild.id, {});
        const botMember = guild.members.me;
        const perms = botMember ? guild.channels.cache.find(channel => channel.isTextBased?.())?.permissionsFor(botMember) : null;
        const health = !botMember ? 'member unavailable' : perms?.has('SendMessages') ? 'send enabled' : 'send permission missing';
        embed.addFields({
          name: `${guild.name.slice(0, 220)} · ${guild.id}`.slice(0, 256),
          value: `Members: ${Number(guild.memberCount ?? 0).toLocaleString()} · ${health}\nAnnouncements: ${configs.announcementChannel ? 'configured' : guild.systemChannel ? 'system channel' : 'not configured'} · Admin-approved invite: ${configs.serverInvite ? 'yes' : 'no'}`,
          inline: false,
        });
      }
      pages.push(embed);
    }
    if (!pages.length) pages.push(base(client).setTitle('Conquest server health').setDescription('Conquest is not currently in any servers.'));
    for (let i = 0; i < pages.length; i++) {
      pages[i].setFooter({ text: `Page ${i + 1}/${pages.length} · Private team report` });
      await source.channel.send({ embeds: [pages[i]], allowedMentions: { parse: [] } });
    }
  },
};

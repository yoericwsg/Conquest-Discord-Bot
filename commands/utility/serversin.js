const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const storage = require('../../utils/storage');
const { base } = require('../../utils/embed');
const { isApplicationOwner } = require('../../systems/owner-access');
const { buildDirectoryEntries } = require('../../systems/server-directory');

const PAGE_SIZE = 10;
const COLLECTOR_TIME = 180_000;

function escapeMarkdown(value) {
  return String(value ?? 'Unknown').replace(/([\\`*_~|])/g, '\\$1').slice(0, 200);
}

function renderPage(client, entries, page) {
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const visible = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const embed = base(client)
    .setTitle('unitClan server directory')
    .setDescription(
      entries.length
        ? `unitClan is in **${entries.length}** server${entries.length === 1 ? '' : 's'}. Links appear only when a server admin has approved one.`
        : 'unitClan is not in any servers yet.',
    );

  if (visible.length) {
    embed.addFields(visible.map(entry => ({
      name: escapeMarkdown(entry.name),
      value: [
        entry.memberCount === null ? '**Members:** unavailable' : `**Members:** ${entry.memberCount.toLocaleString()}`,
        entry.invite ? `[Join server](${entry.invite})` : '*No admin-approved invite*',
      ].join('\n'),
      inline: true,
    })));
  }

  if (pageCount > 1) {
    embed.setFooter({ text: `Page ${page + 1} of ${pageCount} · Links are admin-approved` });
  }

  const components = pageCount > 1
    ? [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('serversin:previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('serversin:next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= pageCount - 1),
    )]
    : [];

  return { embeds: [embed], components, allowedMentions: { parse: [] } };
}

module.exports = {
  name: 'serversin',
  description: 'Privately list the servers unitClan is in',
  cooldown: 10,
  async execute(source, _args, client) {
    const user = source.author;
    if (!await isApplicationOwner(client, user.id)) {
      return source.reply('This command is restricted to the unitClan application owner.');
    }
    if (source.guild) {
      return source.reply('For privacy, run `?serversin` in DMs.');
    }

    const entries = buildDirectoryEntries(
      client.guilds.cache.values(),
      guildId => storage.get('configs.json', guildId, {}),
    );
    let page = 0;
    const response = await source.channel.send(renderPage(client, entries, page));
    const pageCount = Math.ceil(entries.length / PAGE_SIZE);
    if (pageCount <= 1) return response;

    const collector = response.createMessageComponentCollector({
      time: COLLECTOR_TIME,
      filter: interaction => interaction.user.id === user.id,
    });
    collector.on('collect', async interaction => {
      if (interaction.customId === 'serversin:previous') page = Math.max(0, page - 1);
      if (interaction.customId === 'serversin:next') page = Math.min(pageCount - 1, page + 1);
      await interaction.update(renderPage(client, entries, page)).catch(() => null);
    });
    collector.on('end', () => {
      response.edit({ components: [] }).catch(() => null);
    });
    return response;
  },
};

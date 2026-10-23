const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const {
  parseDuration, readState, getActiveDowntime, setDowntime, clearDowntime,
  syncPresence, formatDowntimeEmbed, scheduleDowntimeExpiry, stopExpiryTimer,
  setApplicationDescriptionForDowntime, restoreApplicationDescription,
} = require('../../systems/maintenance');
const { broadcastEmbed } = require('../../systems/announcement-delivery');
const { base, error, info } = require('../../utils/embed');

function splitDurationAndReason(args) {
  for (let count = Math.min(8, args.length); count >= 1; count--) {
    const durationMs = parseDuration(args.slice(0, count).join(' '));
    const reason = args.slice(count).join(' ').trim();
    if (durationMs && reason) return { durationMs, reason };
  }
  return null;
}

function makeMaintenance(client, actor, reason, durationMs) {
  const now = Date.now();
  return {
    endAt: now + durationMs,
    reason: reason.slice(0, 500),
    startedAt: now,
    startedById: actor.id,
    startedByTag: actor.tag ?? actor.username,
    rankLabel: readState().downtimeBy || 'Owner/team',
  };
}

module.exports = {
  name: 'downtime',
  description: 'Set or check unitClan maintenance from owner DMs',
  aliases: ['down'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('downtime')
      .setDescription('Set or check unitClan maintenance (bot DMs only)')
      .setContexts(InteractionContextType.BotDM)
      .addSubcommand(s => s.setName('set').setDescription('Pause AI and bot commands for a reason and duration')
        .addStringOption(o => o.setName('duration').setDescription('Examples: 30sec, 1hr, 2days, 3months').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Why unitClan is going down').setMaxLength(500).setRequired(true)))
      .addSubcommand(s => s.setName('status').setDescription('Show the current maintenance status'))
      .addSubcommand(s => s.setName('cancel').setDescription('End maintenance early and restore normal status')),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const reply = payload => isSlash ? source.reply(payload) : source.channel.send(payload);
    if (source.guild) return reply({ content: 'Run this command in unitClan’s DMs.' });
    if (!await isApplicationOwner(client, actor.id)) {
      return reply({ content: 'This command is restricted to the verified unitClan application owner/team.' });
    }

    let action = isSlash ? source.options.getSubcommand() : String(args[0] ?? '').toLowerCase();
    let durationAndReason = null;
    if (!isSlash && ['cancel', 'end', 'resume'].includes(action)) action = 'cancel';
    else if (!isSlash && ['status', ''].includes(action)) action = 'status';
    else if (isSlash && action === 'set') {
      durationAndReason = splitDurationAndReason([
        source.options.getString('duration'),
        source.options.getString('reason'),
      ]);
    } else if (!isSlash) {
      durationAndReason = splitDurationAndReason(args);
      action = durationAndReason ? 'set' : 'invalid';
    }

    if (action === 'cancel') {
      const previous = clearDowntime();
      stopExpiryTimer(client);
      if (!previous) {
        const descriptionRestored = await restoreApplicationDescription(client);
        syncPresence(client);
        return reply({ embeds: [info(client, 'No active downtime', [],
          descriptionRestored ? 'unitClan is already marked online.' : 'unitClan is online, but Discord did not allow its application description to be restored. Check the Developer Portal.')] });
      }
      const descriptionRestored = await restoreApplicationDescription(client);
      syncPresence(client);
      const embed = base(client)
        .setColor('#57F287')
        .setTitle('✅  unitClan is back online')
        .setDescription(`Maintenance ended early.\n**Reason:** ${previous.reason}`);
      const results = await broadcastEmbed(client, embed, '✅ unitClan is back online.');
      if (!descriptionRestored) embed.addFields({ name: 'Profile description', value: 'Discord did not allow the description to be restored automatically. Check the Developer Portal.' });
      embed.setFooter({ text: `Sent to ${results.filter(result => result.sent).length} server(s); mentions disabled.` });
      return reply({ embeds: [embed] });
    }

    if (action === 'status') {
      const active = getActiveDowntime();
      if (!active) return reply({ embeds: [info(client, 'unitClan status', [], 'No active downtime. Use `?downtime 1hr fixing something` to start a maintenance window.')] });
      return reply({ embeds: [formatDowntimeEmbed(client, active)] });
    }

    if (action !== 'set' || !durationAndReason) {
      return reply({ embeds: [error(client, 'Usage',
        '`?downtime 1hr fixing something`\nUnits: seconds, minutes, hours, days, weeks, months (30 days), years (365 days). You can combine units, such as `1hr 30min`. Use `?downtime cancel` to end it early.')] });
    }

    const downtime = makeMaintenance(client, actor, durationAndReason.reason, durationAndReason.durationMs);
    setDowntime(downtime);
    syncPresence(client);
    const descriptionUpdated = await setApplicationDescriptionForDowntime(client, downtime);

    const embed = formatDowntimeEmbed(client, downtime);
    const timestamp = Math.floor(downtime.endAt / 1000);
    const content = `🛠️ **unitClan is temporarily down.** ${downtime.reason} Expected back <t:${timestamp}:R>. Started by ${downtime.rankLabel} · ${downtime.startedByTag}.`;
    const results = await broadcastEmbed(client, embed, content);
    scheduleDowntimeExpiry(client, async expired => {
      await restoreApplicationDescription(client);
      const onlineEmbed = base(client)
        .setColor('#57F287')
        .setTitle('✅  unitClan is back online')
        .setDescription(`The maintenance window has ended.\n**Reason:** ${expired.reason}\n**Started by:** ${expired.rankLabel} · ${expired.startedByTag}`);
      await broadcastEmbed(client, onlineEmbed, '✅ unitClan maintenance has ended. The bot is back online.');
    });

    const sent = results.filter(result => result.sent).length;
    const skipped = results.length - sent;
    const resultEmbed = base(client)
      .setColor('#FEE75C')
      .setTitle('🛠️  Maintenance mode enabled')
      .setDescription(
        `**Reason:** ${downtime.reason}\n` +
        `**Expected back:** <t:${timestamp}:R>\n` +
        `**Started by:** ${downtime.rankLabel} · ${downtime.startedByTag}\n\n` +
        `Posted to ${sent} server(s); ${skipped} skipped because no configured announcement or system channel was available.` +
        (descriptionUpdated ? '\nThe Discord application description was also marked down.' : '\nThe Discord application description could not be changed; status and announcements were updated.'),
      );
    return reply({ embeds: [resultEmbed] });
  },
};


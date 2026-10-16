const {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
} = require('discord.js');
const { panel, success, error, base, SEP } = require('../../utils/embed');
const storage = require('../../utils/storage');

function parseTime(str) {
  const map = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  return parseInt(match[1]) * (map[match[2].toLowerCase()] ?? 0) * 1000;
}

module.exports = {
  name: 'giveaway',
  description: 'Start, end, or reroll a giveaway',
  aliases: ['gw'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('giveaway')
      .setDescription('Giveaway management')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s =>
        s.setName('start')
          .setDescription('Start a new giveaway')
          .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
          .addStringOption(o => o.setName('duration').setDescription('Duration, e.g. 10m, 2h, 1d').setRequired(true))
          .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20).setRequired(false)))
      .addSubcommand(s =>
        s.setName('end')
          .setDescription('End a giveaway early')
          .addStringOption(o => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
      .addSubcommand(s =>
        s.setName('reroll')
          .setDescription('Reroll a finished giveaway')
          .addStringOption(o => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true))),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild    = source.guild;
    const channel  = source.channel;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? channel.send(opts);

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild))
      return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Server**.')] });

    const sub = isSlash ? source.options.getSubcommand() : (args[0] ?? 'start');

    // ── START ──────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      const prize    = isSlash ? source.options.getString('prize')    : args.slice(2).join(' ');
      const durStr   = isSlash ? source.options.getString('duration') : args[1];
      const winners  = isSlash ? (source.options.getInteger('winners') ?? 1) : 1;
      const duration = parseTime(durStr ?? '');

      if (!prize) return reply({ embeds: [error(client, 'Missing Prize', 'Usage: `?giveaway start 10m 1 Big Prize`')] });
      if (!duration) return reply({ embeds: [error(client, 'Bad Duration', 'Use `10m`, `2h`, `1d`, etc.')] });

      const endsAt   = Date.now() + duration;
      const endsStr  = `<t:${Math.floor(endsAt / 1000)}:R>`;

      const embed = base(client)
        .setColor('#FEE75C')
        .setTitle('🎉  GIVEAWAY')
        .setDescription([
          `**Prize:** ${prize}`,
          `**Winners:** ${winners}`,
          `**Ends:** ${endsStr}`,
          ``,
          `React with 🎉 or click **Enter** to participate!`,
        ].join('\n'))
        .setFooter({ text: `${winners} winner(s) ${SEP} Ends` })
        .setTimestamp(endsAt);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_enter').setLabel('🎉  Enter').setStyle(ButtonStyle.Primary),
      );

      await reply({ embeds: [panel(client, '✅  Giveaway Started', `Giveaway posted in <#${channel.id}>!`)], ephemeral: isSlash }).catch(() => {});

      const gwMsg = await channel.send({ embeds: [embed], components: [row] });

      // Store giveaway data
      const gwData = { prize, winners, endsAt, hostId: isSlash ? source.user.id : source.author.id, entries: [], active: true, channelId: channel.id };
      storage.set('giveaways.json', gwMsg.id, gwData);

      // Schedule end
      setTimeout(() => endGiveaway(gwMsg.id, gwMsg, client, gwData), duration);

    // ── END ────────────────────────────────────────────────────────────────────
    } else if (sub === 'end') {
      const msgId = isSlash ? source.options.getString('message_id') : args[1];
      if (!msgId) return reply({ embeds: [error(client, 'Missing ID', 'Provide the giveaway message ID.')] });

      const gwData = storage.get('giveaways.json', msgId, null);
      if (!gwData) return reply({ embeds: [error(client, 'Not Found', 'No giveaway found with that message ID.')] });

      let gwMsg;
      try { gwMsg = await channel.messages.fetch(msgId); } catch {
        return reply({ embeds: [error(client, 'Not Found', 'Could not fetch that message.')] });
      }

      await endGiveaway(msgId, gwMsg, client, gwData);
      return reply({ embeds: [success(client, 'Ended', 'Giveaway ended early.')] });

    // ── REROLL ─────────────────────────────────────────────────────────────────
    } else if (sub === 'reroll') {
      const msgId = isSlash ? source.options.getString('message_id') : args[1];
      if (!msgId) return reply({ embeds: [error(client, 'Missing ID', 'Provide the giveaway message ID.')] });

      const gwData = storage.get('giveaways.json', msgId, null);
      if (!gwData || !gwData.entries?.length)
        return reply({ embeds: [error(client, 'No Entries', 'No entries found for that giveaway.')] });

      const newWinners = pickWinners(gwData.entries, gwData.winners);
      const mentions   = newWinners.map(id => `<@${id}>`).join(', ');

      await channel.send({ embeds: [success(client, '🎉  Reroll!', `New winner(s): ${mentions}\nCongratulations on **${gwData.prize}**!`)] });
      return reply({ embeds: [success(client, 'Rerolled', `New winners selected: ${mentions}`)] });
    }
  },
};

function pickWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function endGiveaway(msgId, gwMsg, client, gwData) {
  try {
    const data = storage.get('giveaways.json', msgId, gwData);
    if (!data.active) return;

    // Collect button entries too
    const entries = data.entries ?? [];

    if (!entries.length) {
      await gwMsg.edit({ embeds: [base(client).setColor('#ED4245').setTitle('🎉  GIVEAWAY ENDED').setDescription(`**Prize:** ${data.prize}\n\n❌ No participants.`).setTimestamp()], components: [] });
      storage.set('giveaways.json', msgId, { ...data, active: false });
      return;
    }

    const winners  = pickWinners(entries, data.winners);
    const mentions = winners.map(id => `<@${id}>`).join(', ');

    await gwMsg.edit({ embeds: [base(client).setColor('#57F287').setTitle('🎉  GIVEAWAY ENDED').setDescription(
      `**Prize:** ${data.prize}\n**Winner(s):** ${mentions}\n\nCongratulations! 🎊`
    ).setTimestamp()], components: [] });

    const channel = gwMsg.channel;
    await channel.send({ content: `🎉 Congratulations ${mentions}! You won **${data.prize}**!` });

    storage.set('giveaways.json', msgId, { ...data, active: false, winnerIds: winners });
  } catch (e) {
    console.error('[GIVEAWAY END ERR]', e.message);
  }
}

// Handle button entries from index.js interactionCreate
module.exports.handleGiveawayButton = async function(interaction, client) {
  if (interaction.customId !== 'gw_enter') return;
  const msgId  = interaction.message.id;
  const userId = interaction.user.id;
  const data   = storage.get('giveaways.json', msgId, null);

  if (!data) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
  if (!data.active) return interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });

  if (data.entries.includes(userId)) {
    // Toggle: remove if already entered
    data.entries = data.entries.filter(id => id !== userId);
    storage.set('giveaways.json', msgId, data);
    return interaction.reply({ content: '✅ You have been removed from this giveaway.', ephemeral: true });
  }

  data.entries.push(userId);
  storage.set('giveaways.json', msgId, data);
  return interaction.reply({ content: `🎉 You're entered! **${data.entries.length}** participant(s) so far.`, ephemeral: true });
};

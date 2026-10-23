const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, OAuth2Scopes,
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
} = require('discord.js');
const { success, error, warning, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SKIP_TYPES = new Set([
  ChannelType.GuildNewsThread,
  ChannelType.GuildPublicThread,
  ChannelType.GuildPrivateThread,
  ChannelType.GuildDirectory,
]);

// ── Resolve stored overwrite names → real IDs in target guild ────────────────
function resolveOverwrites(overwrites, guild) {
  if (!Array.isArray(overwrites)) return [];
  const result = [];
  for (const ow of overwrites) {
    try {
      if (ow.type === 'everyone') {
        result.push({ id: guild.id, allow: BigInt(ow.allow), deny: BigInt(ow.deny) });
      } else if (ow.type === 'role' && ow.name) {
        const role = guild.roles.cache.find(r => r.name === ow.name);
        if (role) result.push({ id: role.id, allow: BigInt(ow.allow), deny: BigInt(ow.deny) });
      }
    } catch { /* skip invalid */ }
  }
  return result;
}

// ── Create one channel from snapshot data ────────────────────────────────────
async function pasteChannel(guild, chData) {
  if (SKIP_TYPES.has(chData.channelType)) return null;

  const parentCat = chData.parentName
    ? guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === chData.parentName.toLowerCase())
    : null;

  const options = {
    name:                 chData.name,
    type:                 chData.channelType,
    reason:               'unitClan ?paste',
    permissionOverwrites: resolveOverwrites(chData.overwrites, guild),
  };

  if (parentCat) options.parent = parentCat.id;

  switch (chData.channelType) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      if (chData.topic)    options.topic           = chData.topic;
      if (chData.nsfw)     options.nsfw             = chData.nsfw;
      if (chData.slowmode) options.rateLimitPerUser = chData.slowmode;
      break;
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      if (chData.bitrate)   options.bitrate   = chData.bitrate;
      if (chData.userLimit) options.userLimit = chData.userLimit;
      break;
    case ChannelType.GuildForum:
      if (chData.topic) options.topic = chData.topic;
      break;
  }

  return guild.channels.create(options);
}

// ── Apply full server snapshot (only adds, never deletes) ────────────────────
async function applyServerSnap(guild, snap) {
  const counts = { roles: 0, categories: 0, channels: 0, skipped: 0, errors: 0 };
  const firstErrors = [];

  // Check bot permissions in TARGET guild
  const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
  if (!me) throw new Error('Could not fetch bot member in target server.');
  if (!me.permissions.has(PermissionFlagsBits.Administrator) &&
      (!me.permissions.has(PermissionFlagsBits.ManageRoles) || !me.permissions.has(PermissionFlagsBits.ManageChannels))) {
    throw new Error(
      `I don't have **Administrator** (or both Manage Roles + Manage Channels) in **${guild.name}**.\n` +
      `Please give me Administrator permission there first, then try again.`
    );
  }

  await guild.roles.fetch().catch(() => null);
  await guild.channels.fetch().catch(() => null);

  // 1. Roles
  for (const rData of snap.roles) {
    if (guild.roles.cache.find(r => r.name === rData.name)) { counts.skipped++; continue; }
    try {
      await guild.roles.create({
        name:        rData.name,
        color:       rData.color,
        hoist:       rData.hoist,
        mentionable: rData.mentionable,
        permissions: BigInt(rData.permissions),
        reason:      'unitClan ?paste',
      });
      counts.roles++;
    } catch (e) {
      counts.errors++;
      if (firstErrors.length < 3) firstErrors.push(`Role "${rData.name}": ${e.message}`);
    }
    await sleep(350);
  }

  await guild.roles.fetch().catch(() => null);
  await sleep(500);

  // 2. Categories
  for (const catData of snap.categories) {
    const exists = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catData.name.toLowerCase());
    if (exists) { counts.skipped++; continue; }
    try {
      await guild.channels.create({
        name:                 catData.name,
        type:                 ChannelType.GuildCategory,
        permissionOverwrites: resolveOverwrites(catData.overwrites, guild),
        reason:               'unitClan ?paste',
      });
      counts.categories++;
    } catch (e) {
      counts.errors++;
      if (firstErrors.length < 3) firstErrors.push(`Category "${catData.name}": ${e.message}`);
    }
    await sleep(500);
  }

  await guild.channels.fetch().catch(() => null);
  await sleep(500);

  // 3. Channels
  for (const chData of snap.channels) {
    if (SKIP_TYPES.has(chData.channelType)) continue;
    const exists = guild.channels.cache.find(c => c.name === chData.name && c.type === chData.channelType);
    if (exists) { counts.skipped++; continue; }
    try {
      await pasteChannel(guild, chData);
      counts.channels++;
    } catch (e) {
      counts.errors++;
      if (firstErrors.length < 3) firstErrors.push(`Channel "${chData.name}": ${e.message}`);
    }
    await sleep(500);
  }

  counts.firstErrors = firstErrors;
  return counts;
}

// ── Shared paste logic (used by both direct calls and button picker) ──────────
async function runPaste(typeArg, clip, guild, userId, client, sendNew, editFn, skipConfirm) {
  if (typeArg === 'channel') {
    const snap = clip.channel;
    if (!snap) return editFn({ embeds: [error(client, 'Empty Clipboard', 'Use `?copychannel` first.')], components: [] });
    const ch = snap.channel;

    const doCreate = async (fn) => {
      try {
        await fn({ embeds: [panel(client, '⏳  Creating channel...', ['Please wait...'])], components: [] });
        const created = await pasteChannel(guild, ch);
        await fn({ embeds: [success(client, '✅  Channel Pasted', `Created \`#${created.name}\` from your clipboard.\n**Copied from:** \`${snap.fromServer}\``)], components: [] });
      } catch (e) {
        await fn({ embeds: [error(client, 'Failed', e.message)], components: [] });
      }
    };

    if (skipConfirm) { await doCreate(editFn); return; }

    const preview = panel(client, '📋  Paste Channel', [
      `**Will create:** \`#${ch.name}\``,
      ch.topic       ? `**Topic:**    ${ch.topic}` : null,
      ch.parentName  ? `**Category:** \`${ch.parentName}\`` : null,
      `**From:**      \`${snap.fromServer}\``,
      ``,
      `Press **Confirm** to create, or **Cancel** to abort.`,
    ].filter(Boolean));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`pch_${userId}_ok`).setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`pch_${userId}_no`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
    );

    const msg = await sendNew({ embeds: [preview], components: [row] });
    const col = msg.createMessageComponentCollector({ time: 60_000 });
    col.on('collect', async btn => {
      if (btn.user.id !== userId) return btn.reply({ content: 'Not your clipboard.', ephemeral: true });
      col.stop();
      if (btn.customId.endsWith('_no')) return btn.update({ embeds: [warning(client, 'Cancelled', 'Paste cancelled.')], components: [] });
      await doCreate(o => btn.update(o));
    });
    col.on('end', (_, r) => { if (r === 'time') msg.edit({ components: [] }).catch(() => null); });

  } else if (typeArg === 'server') {
    const snap = clip.server;
    if (!snap) return editFn({ embeds: [error(client, 'Empty Clipboard', 'Use `?copyserver` first.')], components: [] });

    const doApply = async (fn) => {
      await fn({ embeds: [panel(client, '⏳  Applying Layout', [
        `Target: **${guild.name}**`,
        `Creating roles → categories → channels from **${snap.fromServer}**…`,
        `This may take a minute for large servers.`,
      ])], components: [] });
      try {
        const r = await applyServerSnap(guild, snap);
        const lines = [
          `**Target server:**      \`${guild.name}\``,
          `**Roles created:**      \`${r.roles}\``,
          `**Categories created:** \`${r.categories}\``,
          `**Channels created:**   \`${r.channels}\``,
          `**Skipped (existed):**  \`${r.skipped}\``,
          `**Errors:**             \`${r.errors}\``,
        ];
        if (r.firstErrors?.length) {
          lines.push(``, `**First error(s):**`);
          r.firstErrors.forEach(e => lines.push(`• ${e}`));
        }
        const embed = r.errors === 0
          ? success(client, '✅  Server Layout Applied', lines.join('\n'))
          : panel(client, '⚠️  Applied with Errors', lines, '#FEE75C');
        await fn({ embeds: [embed], components: [] });
      } catch (e) {
        await fn({ embeds: [error(client, 'Failed', e.message)], components: [] });
      }
    };

    if (skipConfirm) { await doApply(editFn); return; }

    const preview = panel(client, '🏰  Paste Server Layout', [
      `**Copied from:**  \`${snap.fromServer}\``,
      ``,
      `**Will create (skips existing):**`,
      `  • \`${snap.roles.length}\` roles`,
      `  • \`${snap.categories.length}\` categories`,
      `  • \`${snap.channels.length}\` channels`,
      ``,
      `⚠️  Nothing is **deleted** — only missing items are added.`,
      ``,
      `Press **Apply** to continue, or **Cancel** to abort.`,
    ], '#FEE75C');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`psrv_${userId}_ok`).setLabel('✅ Apply Layout').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`psrv_${userId}_no`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
    );

    const msg = await sendNew({ embeds: [preview], components: [row] });
    const col = msg.createMessageComponentCollector({ time: 120_000 });
    col.on('collect', async btn => {
      if (btn.user.id !== userId) return btn.reply({ content: 'Not your clipboard.', ephemeral: true });
      col.stop();
      if (btn.customId.endsWith('_no')) return btn.update({ embeds: [warning(client, 'Cancelled', 'Paste cancelled.')], components: [] });
      await doApply(o => btn.update(o));
    });
    col.on('end', (_, r) => { if (r === 'time') msg.edit({ components: [] }).catch(() => null); });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'paste',
  description: 'Paste your clipboard (channel or server) into this server',
  aliases: ['applytemplate'],
  cooldown: 10,
  slash: {
    data: new SlashCommandBuilder()
      .setName('paste')
      .setDescription('Apply your clipboard to this server (auto-detects what you copied)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o =>
        o.setName('type').setDescription('What to paste (auto-detected if blank)')
          .addChoices(
            { name: '📋 Channel  (?copychannel)', value: 'channel' },
            { name: '🏰 Server layout  (?copyserver)', value: 'server' },
          ))
      .addStringOption(o =>
        o.setName('invite').setDescription('Paste into a different server via invite link (e.g. discord.gg/abc)'))
      .addBooleanOption(o => o.setName('confirm').setDescription('Skip confirmation prompt')),
  },

  async execute(source, args, client) {
    const isSlash     = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const userId      = (source.user ?? source.author).id;
    const sendNew     = opts => source.channel.send(opts);
    const replyOnce   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);
    const skipConfirm = isSlash
      ? (source.options.getBoolean('confirm') ?? false)
      : args.some(a => a.toLowerCase() === 'confirm');

    if (!source.member.permissions.has(PermissionFlagsBits.Administrator))
      return replyOnce({ embeds: [error(client, 'No Permission', 'You need **Administrator** in this server to use paste.')], ephemeral: true });

    const clip = storage.get('clipboard.json', userId, {});

    // ── Resolve target guild (invite link or current server) ──────────────────
    const INVITE_RE = /(?:https?:\/\/)?(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9\-]+)/;
    const inviteArg = isSlash
      ? source.options.getString('invite')
      : args.find(a => INVITE_RE.test(a));

    let targetGuild = source.guild;

    if (inviteArg) {
      const match = inviteArg.match(INVITE_RE);
      const code  = match?.[1];
      if (!code)
        return replyOnce({ embeds: [error(client, 'Invalid Invite', 'Could not parse that invite link.')], ephemeral: true });

      const progressMsg = await sendNew({ embeds: [panel(client, '🔗  Resolving Invite...', [`Looking up \`${code}\`…`])] });

      let invite;
      try {
        invite = await client.fetchInvite(code);
      } catch {
        await progressMsg.edit({ embeds: [error(client, 'Invalid Invite', `\`${code}\` is expired, invalid, or I cannot fetch it.`)] });
        return;
      }

      const guildId = invite.guild?.id;
      if (!guildId) {
        await progressMsg.edit({ embeds: [error(client, 'No Guild', 'That invite does not point to a server.')] });
        return;
      }

      targetGuild = client.guilds.cache.get(guildId);
      if (!targetGuild) {
        const inviteLink = client.generateInvite({
          scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
          ],
        });
        await progressMsg.edit({ embeds: [error(client, 'Not in That Server',
          `I am not in **${invite.guild.name}**.\n\nAdd me first:\n${inviteLink}`)] });
        return;
      }

      await progressMsg.edit({ embeds: [panel(client, '✅  Server Found', [
        `**Target:** \`${targetGuild.name}\``,
        `Applying your clipboard there now…`,
      ])] });
    }

    // ── Determine clipboard type ───────────────────────────────────────────────
    let typeArg = isSlash
      ? source.options.getString('type')
      : args.find(a => a === 'channel' || a === 'server');

    if (!typeArg) {
      const hasServer  = !!clip.server;
      const hasChannel = !!clip.channel;

      if (!hasServer && !hasChannel)
        return replyOnce({ embeds: [error(client, 'Empty Clipboard', 'Nothing copied yet.\nUse `?copyserver` or `?copychannel` first.')], ephemeral: true });

      if (hasServer && !hasChannel)       { typeArg = 'server'; }
      else if (hasChannel && !hasServer)  { typeArg = 'channel'; }
      else {
        // Both present — show picker
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`pick_srv_${userId}`).setLabel('🏰 Server Layout').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`pick_ch_${userId}`).setLabel('📋 Channel').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`pick_no_${userId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
        );
        const msg = await replyOnce({ embeds: [panel(client, '📋  What to Paste?', [
          `Clipboard has both a **server snapshot** and a **channel**.`,
          `Which would you like to paste into \`${targetGuild.name}\`?`,
        ])], components: [row], fetchReply: true });
        const col = msg.createMessageComponentCollector({ time: 30_000 });
        col.on('collect', async btn => {
          if (btn.user.id !== userId) return btn.reply({ content: 'Not your clipboard.', ephemeral: true });
          col.stop();
          if (btn.customId.startsWith('pick_no'))
            return btn.update({ embeds: [warning(client, 'Cancelled', 'Paste cancelled.')], components: [] });
          const chosen = btn.customId.startsWith('pick_srv') ? 'server' : 'channel';
          await btn.update({ embeds: [panel(client, '⏳ Loading...', ['Please wait...'])], components: [] });
          await runPaste(chosen, clip, targetGuild, userId, client, sendNew, o => btn.editReply(o), skipConfirm);
        });
        col.on('end', (_, r) => { if (r === 'time') msg.edit({ components: [] }).catch(() => null); });
        return;
      }
    }

    // ── Run paste ─────────────────────────────────────────────────────────────
    const progressMsg = await sendNew({ embeds: [panel(client, '⏳ Preparing...', [
      `Target: **${targetGuild.name}**`,
      `Loading clipboard…`,
    ])] });
    await runPaste(typeArg, clip, targetGuild, userId, client, sendNew, o => progressMsg.edit(o), skipConfirm);
  },
};

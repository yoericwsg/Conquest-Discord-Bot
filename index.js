require('dotenv').config();
const {
  Client, GatewayIntentBits, Collection, REST, Routes, Partials, ActivityType, MessageFlags
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

const cfg    = require('./config.json');
const { getPrefix } = require('./utils/prefix');
const storage = require('./utils/storage');
const customcmds = require('./systems/customcmds');
const maintenance = require('./systems/maintenance');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
});

client.commands       = new Collection(); // slash  → cmd
client.prefixCommands = new Collection(); // name   → cmd
client.aliases        = new Collection(); // alias  → name
client.cooldowns      = new Collection();

// Crash resilience — a single bad promise/error should never take the whole
// bot down (important on hosts like BotGhost where a crash can loop/stall
// commands until the process is manually restarted).
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});
client.on('error', (err) => console.error('[CLIENT ERROR]', err));
client.on('shardError', (err) => console.error('[SHARD ERROR]', err));
client.slashPayloads  = [];
client.startTime      = Date.now();
client.restarts       = 0;

// Snipe caches (channelId → payload)
client.sniped     = new Map();
client.editSniped = new Map();

// ─── Dynamic Command Loader ───────────────────────────────────────────────────
function loadCommands() {
  const root = path.join(__dirname, 'commands');
  for (const cat of fs.readdirSync(root)) {
    const catPath = path.join(root, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const file of fs.readdirSync(catPath).filter(f => f.endsWith('.js'))) {
      try {
        const cmd = require(path.join(catPath, file));
        if (cmd.slash?.data) {
          client.commands.set(cmd.slash.data.name, cmd);
          client.slashPayloads.push(cmd.slash.data.toJSON());
        }
        if (cmd.name) {
          client.prefixCommands.set(cmd.name, cmd);
          (cmd.aliases || []).forEach(a => client.aliases.set(a, cmd.name));
        }
        const label = cmd.name ?? cmd.slash?.data?.name ?? file;
        console.log(`\x1b[32m[CMD]\x1b[0m ${cat}/${label}`);
      } catch (e) {
        console.error(`\x1b[31m[CMD ERR]\x1b[0m ${cat}/${file}: ${e.message}`);
      }
    }
  }
  console.log(`\x1b[36m[INFO]\x1b[0m Loaded ${client.prefixCommands.size} prefix · ${client.commands.size} slash commands`);
}

// ─── Slash Registration ───────────────────────────────────────────────────────
async function registerSlash(token) {
  const clientId = Buffer.from(token.split('.')[0], 'base64').toString();
  const rest     = new REST().setToken(token);
  const data     = await rest.put(Routes.applicationCommands(clientId), { body: client.slashPayloads });
  console.log(`\x1b[36m[SLASH]\x1b[0m Registered ${data.length} commands`);
}

// ─── Systems ──────────────────────────────────────────────────────────────────
const logger   = require('./systems/logger');
const security = require('./systems/security');
const leveling = require('./systems/leveling');
const tickets  = require('./systems/tickets');
const groq     = require('./systems/groq');
const { handleGiveawayButton } = require('./commands/utility/giveaway');

// ─── Disabled command helper ──────────────────────────────────────────────────
// Protected commands that can never be disabled
const PROTECTED = new Set(['disable', 'enable', 'prefix', 'help']);

function isDisabled(guildId, cmdName) {
  const disabled = storage.get('disabled.json', guildId, []);
  return disabled.includes(cmdName.toLowerCase());
}

function isSystemDisabled(guildId, system) {
  const disabled = storage.get('disabled.json', guildId, []);
  return disabled.includes(`system:${system}`);
}

function getDisableReason(guildId, key) {
  return storage.get('disabled-reasons.json', guildId, {})[key]?.reason ?? null;
}

// Export helpers so config commands can use them
module.exports = { isDisabled, isSystemDisabled, PROTECTED };

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('clientReady', async () => {
  console.log(`\x1b[32m[READY]\x1b[0m ${client.user.tag} is online`);
  console.log(`\x1b[36m[INFO]\x1b[0m ${client.guilds.cache.size} servers | ${client.users.cache.size} cached users`);
  client.restarts++;

  const statuses = [
    { name: `${cfg.version} | ?changelogs latest`, type: ActivityType.Playing },
    { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
    { name: `?help for commands`, type: ActivityType.Listening },
    { name: `🛡️ Anti-Raid Active`, type: ActivityType.Custom },
  ];
  let i = 0;
  client.__conquestRotatePresence = () => {
    const a = statuses[i++ % statuses.length];
    client.user.setPresence({ activities: [{ name: a.name, type: a.type }], status: 'online' });
  };
  maintenance.syncPresence(client);
  security.recoverVerification(client);
  if (!maintenance.getActiveDowntime()) await maintenance.restoreApplicationDescription(client);
  setInterval(() => {
    if (maintenance.getActiveDowntime()) maintenance.syncPresence(client);
    else client.__conquestRotatePresence();
  }, 15_000);
  maintenance.scheduleDowntimeExpiry(client, async expired => {
    await maintenance.restoreApplicationDescription(client);
    const { base } = require('./utils/embed');
    const { broadcastEmbed } = require('./systems/announcement-delivery');
    const embed = base(client)
      .setColor('#57F287')
      .setTitle('✅  Conquest is back online')
      .setDescription(`The maintenance window has ended.\n**Reason:** ${expired.reason}\n**Started by:** ${expired.rankLabel} · ${expired.startedByTag}`);
    await broadcastEmbed(client, embed, '✅ Conquest maintenance has ended. The bot is back online.');
  });

  try { await registerSlash(process.env.DISCORD_TOKEN); }
  catch (e) { console.error(`\x1b[31m[SLASH ERR]\x1b[0m ${e.message}`); }
});

// ─── Slash Commands ───────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    if (interaction.guild && maintenance.getActiveDowntime()) {
      const active = maintenance.getActiveDowntime();
      return interaction.reply({ embeds: [maintenance.formatDowntimeEmbed(client, active)], flags: MessageFlags.Ephemeral });
    }

    // Check if command is disabled in this guild
    if (interaction.guild && isDisabled(interaction.guild.id, interaction.commandName)) {
      const { error } = require('./utils/embed');
      const reason = getDisableReason(interaction.guild.id, interaction.commandName);
      return interaction.reply({ embeds: [error(client, 'Command Disabled',
        `The \`${interaction.commandName}\` command is disabled in this server.${reason ? `\n**Reason:** ${reason}` : ''}\nAsk an admin to run \`?enable ${interaction.commandName}\` to re-enable it.`)], flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild && interaction.commandName === 'aimode' && isSystemDisabled(interaction.guild.id, 'aimode')) {
      const reason = getDisableReason(interaction.guild.id, 'system:aimode');
      return interaction.reply({ content: `AI mode is disabled in this server.${reason ? ` Reason: ${reason}` : ''} An admin can use the enable aimode command to re-enable it.`, flags: MessageFlags.Ephemeral });
    }

    if (!(await handleCooldown(interaction, cmd))) return;
    try {
      await cmd.execute(interaction, [], client);
    } catch (e) {
      console.error(`\x1b[31m[ERR]\x1b[0m /${interaction.commandName}: ${e.message}`);
      const { error } = require('./utils/embed');
      const opts = { embeds: [error(client, 'Error', e.message)], flags: MessageFlags.Ephemeral };
      (interaction.replied || interaction.deferred) ? interaction.followUp(opts) : interaction.reply(opts);
    }
  }
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('ticket_')) tickets.handleButton(interaction, client);
    if (interaction.customId === 'gw_enter') handleGiveawayButton(interaction, client);
    if (interaction.customId.startsWith('verify_')) {
      const guildId = interaction.customId.slice(7);
      if (guildId !== interaction.guild.id) return;

      // Spam-click cooldown (3s per user)
      global.__verifyCooldown ??= new Map();
      const cdKey = `${guildId}_${interaction.user.id}`;
      const last  = global.__verifyCooldown.get(cdKey) || 0;
      if (Date.now() - last < 3000) return interaction.reply({ content: '⏳ Hold on, still processing...', ephemeral: true });
      global.__verifyCooldown.set(cdKey, Date.now());

      const configs      = storage.get('configs.json', guildId, {});
      const verifyRole   = configs.verifyRole;
      const unverifiedId = configs.unverifiedRole;
      if (!verifyRole) return interaction.reply({ content: '⚠️ Verification role not configured.', ephemeral: true });
      if (interaction.member.roles.cache.has(verifyRole))
        return interaction.reply({ content: '✅ You\'re already verified!', ephemeral: true });
      try {
        await interaction.member.roles.add(verifyRole);
        if (unverifiedId && interaction.member.roles.cache.has(unverifiedId)) {
          await interaction.member.roles.remove(unverifiedId).catch(() => null);
        }
        await interaction.reply({ content: '✅ You\'ve been verified! Welcome!', ephemeral: true });

        // Log to configured log channel, if any
        if (configs.logChannel) {
          const logCh = interaction.guild.channels.cache.get(configs.logChannel);
          if (logCh?.send) {
            const { info } = require('./utils/embed');
            logCh.send({ embeds: [info(client, '✅ Member Verified', [], `${interaction.user} (\`${interaction.user.tag}\`) just verified.`)] }).catch(() => null);
          }
        }
      } catch {
        await interaction.reply({ content: '❌ Couldn\'t give you the role — check my role position/permissions.', ephemeral: true });
      }
    }
  }
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('poll_')) {
      // poll votes handled inline
    }
  }
});

// ─── Prefix Commands ─────────────────────────────────────────────────────────
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Only explicit owner/team controls are accepted in DMs. The commands also
  // check the verified application owner/team before doing anything.
  if (!message.guild) {
    const dmPrefix = cfg.defaultPrefix || '?';
    if (!message.content.startsWith(dmPrefix)) return;
    const [rawCommand, ...args] = message.content.slice(dmPrefix.length).trim().split(/\s+/);
    const commandName = String(rawCommand ?? '').toLowerCase();
    if (!['serversin', 'bypassroleadd', 'downtime', 'down', 'downtimeby', 'announce', 'ann', 'broadcast', 'checkservers', 'forcegeninvite', 'changelogs', 'changelog', 'release', 'antiraid'].includes(commandName)) return;

    const commandKey = client.aliases.get(commandName) ?? commandName;
    const command = client.prefixCommands.get(commandKey);
    if (!command) return;

    client.__conquestDmCommandCooldowns ??= new Map();
    const cooldownKey = `${commandName}:${message.author.id}`;
    const nextAllowedAt = client.__conquestDmCommandCooldowns.get(cooldownKey) ?? 0;
    if (Date.now() < nextAllowedAt) {
      const seconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);
      return message.reply(`Please wait ${seconds}s before using this command again.`);
    }
    client.__conquestDmCommandCooldowns.set(
      cooldownKey,
      Date.now() + (Number(command.cooldown) || 0) * 1000,
    );

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(`\x1b[31m[DM CMD ERR]\x1b[0m ?${commandName}: ${e.message}`);
      const { error } = require('./utils/embed');
      message.reply({ embeds: [error(client, 'Error', e.message)] }).catch(() => null);
    }
    return;
  }

  // ── AFK ping detection ──────────────────────────────────────────────────────
  try {
    if (message.mentions.users.size) {
      for (const [userId, user] of message.mentions.users) {
        const afkData = storage.get('afk.json', userId, null);
        if (!afkData) continue;
        const mins = Math.floor((Date.now() - afkData.since) / 60000);
        const { info } = require('./utils/embed');
        message.channel.send({ embeds: [info(client, `💤  ${user.username} is AFK`,
          `**Reason:** ${afkData.reason}\n**Away for:** ${mins} min`)] })
          .then(m => setTimeout(() => m.delete().catch(() => null), 8000))
          .catch(() => null);
      }
    }
    // Clear AFK for author if they send a non-command message
    const authorAfk = storage.get('afk.json', message.author.id, null);
    if (authorAfk) {
      const prefix = getPrefix(message.guild.id);
      if (!message.content.startsWith(prefix)) {
        storage.set('afk.json', message.author.id, null);
        const { info } = require('./utils/embed');
        message.channel.send({ embeds: [info(client, '👋  Welcome Back!',
          `Your AFK status has been removed.`)] })
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000))
          .catch(() => null);
      }
    }
  } catch {}

  // Systems (isolated — crashes here won't kill prefix handling)
  if (!isSystemDisabled(message.guild.id, 'leveling')) {
    try { leveling.handleMessage(message, client); } catch (e) { console.error('[LEVELING ERR]', e.message); }
  }
  if (!isSystemDisabled(message.guild.id, 'security')) {
    try { security.handleMessage(message, client); } catch (e) { console.error('[SECURITY ERR]', e.message); }
  }

  const prefix = getPrefix(message.guild.id);

  // ── AI Mode ─────────────────────────────────────────────────────────────────
  // If this channel has AI mode on, respond with Groq (skip if it's a command)
  try {
    const aiData    = storage.get('aimode.json', message.channel.id, null);
    const aiEnabled = aiData === true || (aiData && aiData.enabled);
    if (aiEnabled && !isSystemDisabled(message.guild.id, 'aimode') && !maintenance.getActiveDowntime() && !message.content.startsWith(prefix)) {

      const aiMode = (aiData && aiData.mode) ? aiData.mode : 'casual';

      // Modes that support Discord actions (moderation, channel/role management, etc.)
      const ACTION_MODES = ['code', 'chill', 'casual', 'gf', 'build', 'server'];
      const guildConfigs = storage.get('configs.json', message.guild.id, {});
      const aiActionRole = guildConfigs.aiActionRole;

      // canDoActions: mode must allow it AND (no role set OR user has role OR user is admin)
      const { PermissionFlagsBits: PF } = require('discord.js');
      const canDoActions = ACTION_MODES.includes(aiMode) && (
        !aiActionRole ||
        message.member.roles.cache.has(aiActionRole) ||
        message.member.permissions.has(PF.ManageGuild)
      );
      if (['build', 'server'].includes(aiMode) && !canDoActions) {
        message.channel.send('Server-building actions are restricted in this server. Ask an admin to give you the configured AI role or Manage Server permission.').catch(() => null);
        return;
      }

      // Persistent typing — re-send every 8s so it doesn't fade mid-response
      message.channel.sendTyping().catch(() => null);
      const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => null), 8000);

      // Display name (server nickname > global display name > username)
      const displayName = message.member?.displayName ?? message.author.displayName ?? message.author.username;

      // Image attachments
      const imageUrls = [...message.attachments.values()]
        .filter(a => a.contentType?.startsWith('image/'))
        .map(a => a.url)
        .slice(0, 4);

      // Mentioned users with display names
      const mentionedUsers = await Promise.all(
        [...message.mentions.users.values()].map(async u => {
          const mem = await message.guild.members.fetch(u.id).catch(() => null);
          return { id: u.id, username: u.username, displayName: mem?.displayName ?? u.username };
        })
      );

      let replyText;
      try {
        replyText = await groq.chat(
          message.channel.id,
          message.content,
          displayName,
          message.author.id,
          aiMode,
          message.guild,
          message.channel,
          imageUrls,
          mentionedUsers,
          canDoActions,
        );
      } finally {
        clearInterval(typingInterval);
      }

      const chunks = replyText.match(/[\s\S]{1,1900}/g) || [replyText];
      let first = true;
      for (const chunk of chunks) {
        if (first) {
          await message.reply({ content: chunk, allowedMentions: { repliedUser: false } }).catch(() =>
            message.channel.send(chunk).catch(() => null)
          );
          first = false;
        } else {
          await message.channel.send(chunk).catch(() => null);
        }
      }
      return;
    }
  } catch (e) {
    console.error('[AI MODE ERR]', e.message);
    message.channel.send('my brain lagged for a sec 💀 try that again').catch(() => null);
  }

  if (!message.content.startsWith(prefix)) return;

  let args      = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  if (!cmdName) return;

  let effectiveCmdName = cmdName;
  const toggleShorthand = /^(disable|enable)([a-z][a-z0-9_-]*)$/.exec(cmdName);
  if (toggleShorthand && client.prefixCommands.has(toggleShorthand[1])) {
    effectiveCmdName = toggleShorthand[1];
    args = [toggleShorthand[2], ...args];
  }
  const cmdKey = client.aliases.get(effectiveCmdName) ?? effectiveCmdName;
  const cmd    = client.prefixCommands.get(cmdKey);
  const activeDowntime = maintenance.getActiveDowntime();
  if (activeDowntime) {
    return message.channel.send({ embeds: [maintenance.formatDowntimeEmbed(client, activeDowntime)] });
  }

  if (!cmd) {
    // Check custom server commands
    const custom = customcmds.get(message.guild.id, cmdName);
    if (custom) {
      message.channel.send(custom.response).catch(() => null);
    }
    return;
  }

  if (cmdKey === 'aimode' && isSystemDisabled(message.guild.id, 'aimode')) {
    const reason = getDisableReason(message.guild.id, 'system:aimode');
    return message.channel.send(`AI mode is disabled in this server.${reason ? ` Reason: ${reason}` : ''} An admin can use the enable aimode command to re-enable it.`);
  }

  console.log(`\x1b[34m[PREFIX]\x1b[0m ${prefix}${cmdName} · ${message.author.tag} · ${message.guild.name}`);

  // Check disabled commands
  if (!PROTECTED.has(cmdKey) && isDisabled(message.guild.id, cmdKey)) {
    const { error } = require('./utils/embed');
    const reason = getDisableReason(message.guild.id, cmdKey);
    return message.channel.send({ embeds: [error(client, 'Command Disabled',
      `The \`${cmdKey}\` command is disabled in this server.${reason ? `\n**Reason:** ${reason}` : ''}\nAsk an admin to run \`${prefix}enable ${cmdKey}\` to re-enable it.`)] });
  }

  if (!(await handleCooldown(message, cmd))) return;

  try {
    await cmd.execute(message, args, client);
  } catch (e) {
    console.error(`\x1b[31m[ERR]\x1b[0m ${prefix}${cmdName}: ${e.message}`);
    const { error } = require('./utils/embed');
    message.channel.send({ embeds: [error(client, 'Error', e.message)] }).catch(() => null);
  }
});

// ─── Message Delete → Snipe ───────────────────────────────────────────────────
client.on('messageDelete', msg => {
  try {
    if (msg.author?.bot) return;
    if (msg.content || msg.attachments?.size) {
      client.sniped.set(msg.channel.id, {
        author:      msg.author,
        content:     msg.content,
        attachments: [...(msg.attachments?.values() ?? [])].map(a => a.proxyURL),
        deletedAt:   Date.now(),
      });
    }
  } catch {}
  logger.onMessageDelete(msg, client);
});

// ─── Message Edit → EditSnipe ─────────────────────────────────────────────────
client.on('messageUpdate', (oldMsg, newMsg) => {
  try {
    if (oldMsg.author?.bot) return;
    if (oldMsg.content && oldMsg.content !== newMsg.content) {
      client.editSniped.set(oldMsg.channel.id, {
        author:     oldMsg.author,
        oldContent: oldMsg.content,
        newContent: newMsg.content,
        editedAt:   Date.now(),
      });
    }
  } catch {}
  logger.onMessageEdit(oldMsg, newMsg, client);
});

// ─── Member Events ────────────────────────────────────────────────────────────
client.on('guildMemberAdd',    m => {
  logger.onJoin(m, client);
  if (!isSystemDisabled(m.guild.id, 'security')) security.onMemberJoin(m, client);
  if (!isSystemDisabled(m.guild.id, 'welcome')) handleWelcome(m);
});
client.on('guildMemberRemove', m => { logger.onLeave(m, client); handleLeave(m); });
client.on('channelDelete',     ch   => { if (ch.guild && !isSystemDisabled(ch.guild.id, 'security')) security.onChannelDelete(ch, client); });
client.on('roleDelete',        role => { if (role.guild && !isSystemDisabled(role.guild.id, 'security')) security.onRoleDelete(role, client); });

// ─── Welcome / Leave Messages ─────────────────────────────────────────────────
const { EmbedBuilder } = require('discord.js');

async function handleWelcome(member) {
  try {
    const configs = storage.get('configs.json', member.guild.id, {});
    if (isSystemDisabled(member.guild.id, 'welcome') || !configs.welcomeChannel) return;
    const ch = member.guild.channels.cache.get(configs.welcomeChannel);
    if (!ch) return;
    const msg = (configs.welcomeMessage || 'Welcome {user} to **{server}**! You are member **#{count}**!')
      .replace('{user}', `${member.user}`)
      .replace('{username}', member.user.username)
      .replace('{server}', member.guild.name)
      .replace('{count}', member.guild.memberCount);
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle(`👋 Welcome to ${member.guild.name}!`)
      .setDescription(msg)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp()
      .setFooter({ text: `Conquest ${cfg.version}`, iconURL: client.user.displayAvatarURL() });
    ch.send({ embeds: [embed] });

    // Auto-role
    if (!isSystemDisabled(member.guild.id, 'autorole') && configs.autoRole) {
      const role = member.guild.roles.cache.get(configs.autoRole);
      if (role) member.roles.add(role).catch(() => null);
    }
  } catch (e) { console.error('[WELCOME ERR]', e.message); }
}

async function handleLeave(member) {
  try {
    const configs = storage.get('configs.json', member.guild.id, {});
    if (isSystemDisabled(member.guild.id, 'welcome') || !configs.leaveChannel) return;
    const ch = member.guild.channels.cache.get(configs.leaveChannel);
    if (!ch) return;
    const msg = (configs.leaveMessage || '**{username}** has left the server.')
      .replace('{user}', `${member.user}`)
      .replace('{username}', member.user?.username ?? 'Unknown')
      .replace('{server}', member.guild.name);
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setDescription(msg)
      .setTimestamp()
      .setFooter({ text: `Conquest ${cfg.version}`, iconURL: client.user.displayAvatarURL() });
    ch.send({ embeds: [embed] });
  } catch {}
}

// ─── Cooldown Helper ─────────────────────────────────────────────────────────
async function handleCooldown(source, cmd) {
  if (!cmd.cooldown) return true;
  const userId  = source.user?.id ?? source.author?.id;
  const name    = cmd.name ?? cmd.slash?.data?.name ?? 'unknown';
  if (!client.cooldowns.has(name)) client.cooldowns.set(name, new Collection());
  const ts  = client.cooldowns.get(name);
  const now = Date.now();
  const cdMs = cmd.cooldown * 1000;
  if (ts.has(userId)) {
    const exp = ts.get(userId) + cdMs;
    if (now < exp) {
      const rem = ((exp - now) / 1000).toFixed(1);
      const { warning } = require('./utils/embed');
      const embed = warning(client, 'Cooldown', `Please wait **${rem}s** before using this command again.`);
      if (typeof source.isChatInputCommand === 'function' && source.isChatInputCommand()) {
        source.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
      } else {
        source.channel?.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete().catch(() => null), 4000)).catch(() => null);
      }
      return false;
    }
  }
  ts.set(userId, now);
  setTimeout(() => ts.delete(userId), cdMs);
  return true;
}

// ─── Global Error Handlers ───────────────────────────────────────────────────
// ─── Boot ─────────────────────────────────────────────────────────────────────
loadCommands();

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('\x1b[31m[FATAL]\x1b[0m DISCORD_TOKEN not set'); process.exit(1); }
client.login(token);

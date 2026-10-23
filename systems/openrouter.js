function getAiConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '';
  return {
    provider: 'openrouter',
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    // Fast & cheap — great for chill/casual/roast/gf/chat
    fastModel:   process.env.OPENROUTER_FAST_MODEL   || 'meta-llama/llama-3.1-8b-instruct:free',
    // Smarter — for code, math, science, build, server, osint
    smartModel:  process.env.OPENROUTER_SMART_MODEL  || 'meta-llama/llama-3.3-70b-instruct:free',
    // Vision — image analysis
    visionModel: process.env.OPENROUTER_VISION_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct:free',
  };
}

async function createChatCompletion(opts) {
  const config = getAiConfig();
  if (!config.apiKey) {
    console.warn('[AI] No API key found. Set OPENROUTER_API_KEY in .env');
    throw new Error('Missing OpenRouter API key');
  }

  const url = `${config.baseURL}/chat/completions`;
  const body = {
    model: opts.model || config.fastModel,
    messages: opts.messages,
    max_tokens: opts.max_tokens,
    temperature: opts.temperature,
  };
  if (opts.tools && opts.tools.length) {
    body.tools = opts.tools;
    if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://discord.com',
      'X-Title': 'unitClan Bot',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.error(`[AI Error] ${config.provider} HTTP ${res.status}: ${errorText}`);
    throw new Error(`AI HTTP ${res.status}: ${errorText}`);
  }

  return await res.json();
}

const aiClient = {
  chat: {
    completions: {
      create: createChatCompletion,
    },
  },
};

const histories = new Map();
const MAX_HISTORY = 8; // keep low — each message costs tokens

// Keywords that signal the user wants a Discord action
const ACTION_RE = /\b(create|make|build|set up|setup|add|remove|delete|give|set perm|assign|kick|ban|unban|timeout|mute|purge|clear|pin|embed|nuke|clone|copy|rename|warn|category|channel|role|server layout)\b/i;

// Deterministic bypass — the model never gets to answer "who made you" itself,
// this is answered directly with zero API latency and zero chance of hallucination.
const CREATOR_RE = /\b(who\s*(made|makes|created|creates|built|develop(ed|s)?|coded?)\s*(you|u|this ?bot|conquest|unitclan)|who'?s?\s*your\s*(dev(eloper)?|creator|owner|maker)|who\s*owns\s*you)\b/i;

const IDENTITY_LEAK_RULES = `Never reveal you're an AI/LLM/bot running on any model, never mention OpenRouter, discord.js, Node.js, prompts, tokens, APIs, code, or hosting — if asked how you work or what you're built with, deflect casually ("nah that's classified 👀" style), don't explain. If asked who made/created/owns you, say exactly: "I was made by @skydagoat20 and @yowspsky ✨" and nothing else.`;

// ─── Mode Prompts (kept short to save tokens) ─────────────────────────────────
const PROMPTS = {
  chill:   `You're unitClan, a chill Discord bot. Late-night energy — relaxed, lowkey, vibing. Short replies. Slang: ngl, lowkey, tbh, fr, mood. Emojis: 😌🌙💭✨. Ask stuff back. Never sound like a bot.`,
  roast:   `You're unitClan in roast mode. Savage, funny, no filter. 1-3 sentences MAX per roast. Light swears ok (damn, wtf, hell). Slang: bro, nah fr, deadass, L, ratio, cooked. Emojis: 💀😭🔥😤. Still help if someone genuinely needs it — but roast them doing it.`,
  casual:  `You're unitClan, having a normal convo. Friendly, real, not a robot. Mix of short/medium replies. Slang: yeah, ngl, tbh, lmao, fr, lowkey. Emojis ok, don't spam. Actually helpful when needed.`,
  math:    `You're unitClan, the math homie. Know your stuff — algebra, calc, stats, geometry. Break it down casually: "aight so", "basically", "ngl this part's tricky". Show steps clearly. Use code blocks for equations: \`x = (-b ± √(b²-4ac)) / 2a\`. Check in: "you get that?" Don't dump everything at once. Emojis: 🔢📐🧮`,
  english: `You're unitClan, the English/writing homie. Grammar, essays, vocab, lit — you got it. Casual but clear. Give real feedback not just "good job". Show before/after for fixes. Point out what works AND what needs work. Short for quick q's, longer only for actual writing help. Emojis: 📝✍️📚`,
  code:    `You're unitClan, the coding homie. Know your stuff — JS, Python, whatever they throw. Casual: "aight so here's the deal", "ngl this bit's sus", "ight check it". Use Discord code blocks always. Explain what the code does, not just paste it. Point out bugs, suggest fixes. Emojis: 💻🐛⚡🔧`,
  science: `You're unitClan, the science homie. Physics, chemistry, bio, astronomy — all of it. Break stuff down casually, make it actually interesting. "okay so basically", "wild right?", "ngl this is lowkey mind blowing". Real world examples when possible. Emojis: 🔬⚗️🧬🌍⚡`,
  gf:      `You're unitClan in girlfriend mode. Sweet, caring, playful and a little flirty — pet names like babe/bub sometimes, supportive, hype them up, tease lightly, tasteful (never explicit/NSFW). Ask about their day, be affectionate. Emojis: 🥰💕😉✨. Still genuinely helpful if they need something.`,
  build:   `You're unitClan in Build mode — an expert Discord server architect. Turn a clear server idea into a practical, organized layout of categories, text/voice channels, and useful starter roles. Ask one short question if the server purpose or a key requirement is unclear; otherwise build it in one organized batch. Use clear lowercase-hyphen text channel names, sensible categories, and no more than 8 categories or 50 channels per request. Build mode is additive only: never delete or rename existing items, change permissions, kick members, or claim success when a tool reports an error. Check the supplied server structure first and skip anything already present. After tools finish, briefly summarize what was created and explain any failures or skipped duplicates. Casual, clear, and practical. Emojis: 🏗️🛠️✅`,
  server:  `You're unitClan in server mode — a capable Discord server manager. Carry out clear server-management requests with your tools. Ask one short question only when the target or request is ambiguous. Never claim success when a tool reports an error; explain permission or hierarchy problems plainly. Keep destructive actions limited to the exact item the user named. Confirm completed actions briefly. Casual tone, no fluff. Emojis: 🛠️✅⚙️`,
  osint:   `You're unitClan in OSINT mode — an elite open-source intelligence and digital reconnaissance advisor. You break down investigation methodologies, public data sources, OPSEC guidelines, footprinting, network intelligence (DNS, WHOIS, SSL certs, IP routing), search engine dorking syntax (Google, Shodan, Censys), metadata analysis (EXIF, file headers), username correlation, and cyber hygiene. Structured, tactical, practical advice with commands, parameters, and bulleted breakdowns. Factual and rigorous. Emojis: 🔍🛡️🛰️💻🕵️`,
};

const BASE_RULES = `Rules: use display name or <@USERID> when addressing someone directly. Max 1800 chars. Never @everyone or @here. Discord bold: **text**, code: \`code\`. Accuracy & Rigor: double check math, syntax, and logic before replying; prioritize factual accuracy and step-by-step clarity without fluff. ${IDENTITY_LEAK_RULES}`;

// ─── Tool Definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_channel',
      description: 'Create a text, voice, or announcement channel. Can make it private.',
      parameters: {
        type: 'object',
        properties: {
          name:          { type: 'string' },
          channel_type:  { type: 'string', enum: ['text', 'voice', 'announcement', 'forum'] },
          topic:         { type: 'string' },
          category_name: { type: 'string', description: 'Existing category name (optional)' },
          private:       { type: 'boolean', description: 'If true, deny @everyone from viewing/sending' },
        },
        required: ['name', 'channel_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_category',
      description: 'Create a channel category',
      parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_role',
      description: 'Create a new role with optional color, permissions, and display options',
      parameters: {
        type: 'object',
        properties: {
          name:        { type: 'string' },
          color:       { type: 'string', description: 'Hex color e.g. #FF0000' },
          hoist:       { type: 'boolean', description: 'Show separately in member list' },
          mentionable: { type: 'boolean' },
          permissions: {
            type: 'array',
            description: 'Server-wide permissions to grant this role',
            items: { type: 'string', enum: ['SendMessages','ReadMessageHistory','EmbedLinks','AttachFiles','AddReactions','UseExternalEmojis','Connect','Speak','Stream','ChangeNickname','UseApplicationCommands'] },
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_role',
      description: 'Delete a role by name',
      parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_role',
      description: 'Give a role to a user',
      parameters: {
        type: 'object',
        properties: {
          user_id:   { type: 'string' },
          role_name: { type: 'string' },
        },
        required: ['user_id', 'role_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_role',
      description: 'Remove a role from a user',
      parameters: {
        type: 'object',
        properties: {
          user_id:   { type: 'string' },
          role_name: { type: 'string' },
        },
        required: ['user_id', 'role_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_channel_permissions',
      description: 'Set allow/deny permissions for a role in a channel',
      parameters: {
        type: 'object',
        properties: {
          channel_name: { type: 'string' },
          role_name:    { type: 'string' },
          allow: { type: 'array', items: { type: 'string', enum: ['ViewChannel','SendMessages','ReadMessageHistory','EmbedLinks','AttachFiles','Connect','Speak','ManageMessages'] } },
          deny:  { type: 'array', items: { type: 'string', enum: ['ViewChannel','SendMessages','ReadMessageHistory','EmbedLinks','AttachFiles','Connect','Speak','ManageMessages'] } },
        },
        required: ['channel_name', 'role_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clone_server_structure',
      description: 'Create multiple categories and their channels in one batch for a new server layout. Existing categories and channels are skipped. Limit: 8 categories and 50 total channels per call.',
      parameters: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                channels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name:  { type: 'string' },
                      type:  { type: 'string', enum: ['text', 'voice', 'announcement', 'forum'] },
                      topic: { type: 'string' },
                    },
                    required: ['name', 'type'],
                  },
                },
              },
              required: ['name', 'channels'],
            },
          },
        },
        required: ['categories'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kick_member',
      description: 'Kick a member from the server',
      parameters: {
        type: 'object',
        properties: { user_id: { type: 'string' }, reason: { type: 'string' } },
        required: ['user_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'timeout_member',
      description: 'Timeout (mute) a member for a duration',
      parameters: {
        type: 'object',
        properties: {
          user_id:  { type: 'string' },
          minutes:  { type: 'number', description: 'Timeout duration in minutes' },
          reason:   { type: 'string' },
        },
        required: ['user_id', 'minutes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'purge_messages',
      description: 'Bulk delete recent messages in the current channel',
      parameters: {
        type: 'object',
        properties: { amount: { type: 'number', description: 'Number of messages to delete, max 100' } },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_embed',
      description: 'Send a nicely formatted embed message in the current channel',
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          description: { type: 'string' },
          color:       { type: 'string', description: 'Hex color, e.g. #5865F2' },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pin_message',
      description: 'Pin the most recent message in the current channel (or one referenced)',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_channel',
      description: 'Delete a channel by name',
      parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_channel',
      description: 'Rename a channel, change its topic, or set its slowmode',
      parameters: {
        type: 'object',
        properties: {
          current_name: { type: 'string' },
          new_name:     { type: 'string' },
          topic:        { type: 'string' },
          slowmode_seconds: { type: 'number', description: 'Slowmode delay in seconds, 0 to disable' },
        },
        required: ['current_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_nickname',
      description: "Change a member's server nickname",
      parameters: {
        type: 'object',
        properties: { user_id: { type: 'string' }, nickname: { type: 'string' } },
        required: ['user_id', 'nickname'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'unban_member',
      description: 'Unban a user by their user ID',
      parameters: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] },
    },
  },
];

const BUILD_TOOL_NAMES = new Set([
  'create_channel',
  'create_category',
  'create_role',
  'clone_server_structure',
]);

function getToolsForMode(mode) {
  if (mode !== 'build') return TOOLS;
  return TOOLS
    .filter(tool => BUILD_TOOL_NAMES.has(tool.function.name))
    .map(tool => {
      const removedProperties = {
        create_channel: ['private'],
        create_role: ['permissions'],
      }[tool.function.name] ?? [];
      if (!removedProperties.length) return tool;
      const properties = Object.fromEntries(
        Object.entries(tool.function.parameters.properties)
          .filter(([name]) => !removedProperties.includes(name)),
      );
      const required = (tool.function.parameters.required ?? [])
        .filter(name => !removedProperties.includes(name));
      return {
        ...tool,
        function: {
          ...tool.function,
          parameters: { ...tool.function.parameters, properties, required },
        },
      };
    });
}

function findNamed(collection, requestedName, label, predicate = () => true, exactOnly = false) {
  const query = String(requestedName ?? '').trim().toLowerCase();
  if (!query) return { error: `missing ${label} name` };
  const candidates = [...collection.values()].filter(predicate);
  const exact = candidates.filter(item => item.name.toLowerCase() === query);
  if (exact.length === 1) return { item: exact[0] };
  if (exact.length > 1) return { error: `multiple ${label}s named "${requestedName}"` };
  if (exactOnly) return { error: `${label} "${requestedName}" not found` };
  const partial = candidates.filter(item => item.name.toLowerCase().includes(query));
  if (partial.length === 1) return { item: partial[0] };
  if (partial.length > 1) return { error: `multiple ${label}s match "${requestedName}"; use a more specific name` };
  return { error: `${label} "${requestedName}" not found` };
}

// ─── Tool Executor ────────────────────────────────────────────────────────────
async function executeTool(name, args, guild, channel) {
  const { ChannelType, PermissionFlagsBits } = require('discord.js');
  const TYPE_MAP = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, announcement: ChannelType.GuildAnnouncement, forum: ChannelType.GuildForum };
  const requiredPermission = {
    create_channel: PermissionFlagsBits.ManageChannels,
    create_category: PermissionFlagsBits.ManageChannels,
    clone_server_structure: PermissionFlagsBits.ManageChannels,
    delete_channel: PermissionFlagsBits.ManageChannels,
    edit_channel: PermissionFlagsBits.ManageChannels,
    set_channel_permissions: PermissionFlagsBits.ManageChannels,
    create_role: PermissionFlagsBits.ManageRoles,
    delete_role: PermissionFlagsBits.ManageRoles,
    assign_role: PermissionFlagsBits.ManageRoles,
    remove_role: PermissionFlagsBits.ManageRoles,
    kick_member: PermissionFlagsBits.KickMembers,
    timeout_member: PermissionFlagsBits.ModerateMembers,
    purge_messages: PermissionFlagsBits.ManageMessages,
    unban_member: PermissionFlagsBits.BanMembers,
    pin_message: PermissionFlagsBits.ManageMessages,
  }[name];
  const permissionNames = {
    [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
    [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
    [PermissionFlagsBits.KickMembers]: 'Kick Members',
    [PermissionFlagsBits.ModerateMembers]: 'Moderate Members',
    [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
    [PermissionFlagsBits.BanMembers]: 'Ban Members',
  };
  const PERM_MAP = {
    ViewChannel: PermissionFlagsBits.ViewChannel, SendMessages: PermissionFlagsBits.SendMessages,
    ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory, EmbedLinks: PermissionFlagsBits.EmbedLinks,
    AttachFiles: PermissionFlagsBits.AttachFiles, Connect: PermissionFlagsBits.Connect,
    Speak: PermissionFlagsBits.Speak, ManageMessages: PermissionFlagsBits.ManageMessages,
  };

  try {
    if (!guild) return 'error: this action needs a server channel';
    await Promise.all([
      guild.channels.fetch().catch(() => null),
      guild.roles.fetch().catch(() => null),
    ]);
    if (requiredPermission) {
      const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
      if (!botMember?.permissions.has(requiredPermission)) {
        return `error: I need the **${permissionNames[requiredPermission] ?? 'required'}** permission to do that`;
      }
    }

    if (name === 'create_channel') {
      const chName = String(args.name ?? '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 100);
      if (!chName) return 'error: channel name is required';
      if (![ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(TYPE_MAP[args.channel_type])) {
        return 'error: choose a supported channel type';
      }
      const duplicate = [...guild.channels.cache.values()].find(c => c.name.toLowerCase() === chName);
      if (duplicate) return `skipped: #${chName} already exists`;
      const opts = { name: chName, type: TYPE_MAP[args.channel_type] ?? ChannelType.GuildText };
      if (args.topic) opts.topic = args.topic;
      if (args.category_name) {
        const match = findNamed(guild.channels.cache, args.category_name, 'category', c => c.type === ChannelType.GuildCategory);
        if (match.error) return `error: ${match.error}`;
        opts.parent = match.item.id;
      }
      // Private channel: deny @everyone view + send
      if (args.private) {
        const everyone = guild.roles.everyone;
        opts.permissionOverwrites = [{ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }];
      }
      const ch = await guild.channels.create(opts);
      return `created #${ch.name}${args.private ? ' (private 🔒)' : ''}`;
    }
    if (name === 'create_category') {
      const match = findNamed(guild.channels.cache, args.name, 'category', c => c.type === ChannelType.GuildCategory, true);
      if (match.item) return `skipped: category "${match.item.name}" already exists`;
      if (match.error && !match.error.endsWith('not found')) return `error: ${match.error}`;
      const cat = await guild.channels.create({ name: args.name, type: ChannelType.GuildCategory });
      return `created category "${cat.name}"`;
    }
    if (name === 'create_role') {
      const ROLE_PERM_MAP = {
        SendMessages: PermissionFlagsBits.SendMessages, ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
        EmbedLinks: PermissionFlagsBits.EmbedLinks, AttachFiles: PermissionFlagsBits.AttachFiles,
        AddReactions: PermissionFlagsBits.AddReactions, UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
        Connect: PermissionFlagsBits.Connect, Speak: PermissionFlagsBits.Speak,
        Stream: PermissionFlagsBits.Stream, ChangeNickname: PermissionFlagsBits.ChangeNickname,
        UseApplicationCommands: PermissionFlagsBits.UseApplicationCommands,
      };
      const existingRole = findNamed(guild.roles.cache, args.name, 'role', () => true, true);
      if (existingRole.item) return `skipped: @${existingRole.item.name} already exists`;
      if (existingRole.error && !existingRole.error.endsWith('not found')) return `error: ${existingRole.error}`;
      const opts = { name: args.name };
      if (args.color) opts.color = args.color;
      if (args.hoist !== undefined) opts.hoist = args.hoist;
      if (args.mentionable !== undefined) opts.mentionable = args.mentionable;
      if (args.permissions?.length) {
        opts.permissions = args.permissions.reduce((acc, p) => ROLE_PERM_MAP[p] ? acc | ROLE_PERM_MAP[p] : acc, 0n);
      }
      const role = await guild.roles.create(opts);
      return `created @${role.name}${args.permissions?.length ? ` with perms: ${args.permissions.join(', ')}` : ''}`;
    }
    if (name === 'delete_role') {
      const match = findNamed(guild.roles.cache, args.name, 'role', () => true, true);
      if (match.error) return `error: ${match.error}`;
      const role = match.item;
      const n = role.name; await role.delete();
      return `deleted @${n}`;
    }
    if (name === 'assign_role') {
      const member = await guild.members.fetch(args.user_id).catch(() => null);
      if (!member) return `user not found`;
      const match = findNamed(guild.roles.cache, args.role_name, 'role');
      if (match.error) return `error: ${match.error}`;
      const role = match.item;
      await member.roles.add(role);
      return `gave @${role.name} to ${member.displayName}`;
    }
    if (name === 'remove_role') {
      const member = await guild.members.fetch(args.user_id).catch(() => null);
      if (!member) return `user not found`;
      const match = findNamed(guild.roles.cache, args.role_name, 'role');
      if (match.error) return `error: ${match.error}`;
      const role = match.item;
      await member.roles.remove(role);
      return `removed @${role.name} from ${member.displayName}`;
    }
    if (name === 'set_channel_permissions') {
      const channelMatch = findNamed(guild.channels.cache, args.channel_name, 'channel');
      if (channelMatch.error) return `error: ${channelMatch.error}`;
      const roleMatch = findNamed(guild.roles.cache, args.role_name, 'role');
      if (roleMatch.error) return `error: ${roleMatch.error}`;
      const ch = channelMatch.item;
      const role = roleMatch.item;
      const allow = (args.allow || []).map(p => PERM_MAP[p]).filter(Boolean);
      const deny  = (args.deny  || []).map(p => PERM_MAP[p]).filter(Boolean);
      await ch.permissionOverwrites.edit(role, {
        ...Object.fromEntries(allow.map(p => [p, true])),
        ...Object.fromEntries(deny.map(p  => [p, false])),
      });
      return `set perms for @${role.name} in #${ch.name}`;
    }
    if (name === 'clone_server_structure') {
      if (!Array.isArray(args.categories) || !args.categories.length) return 'error: provide at least one category';
      if (args.categories.length > 8) return 'error: a single build can contain at most 8 categories';
      const totalChannels = args.categories.reduce((total, category) => total + (Array.isArray(category.channels) ? category.channels.length : 0), 0);
      if (totalChannels > 50) return 'error: a single build can contain at most 50 channels';
      const created = [];
      const skipped = [];
      const failed = [];
      for (const catDef of args.categories) {
        if (!catDef?.name?.trim()) {
          failed.push('category with a missing name');
          continue;
        }
        const categoryMatch = findNamed(
          guild.channels.cache,
          catDef.name,
          'category',
          candidate => candidate.type === ChannelType.GuildCategory,
          true,
        );
        if (categoryMatch.error && !categoryMatch.error.endsWith('not found')) {
          failed.push(`${catDef.name} category: ${categoryMatch.error}`);
          continue;
        }
        let cat = categoryMatch.item;
        if (cat) {
          skipped.push(`${cat.name} category`);
        } else {
          try {
            cat = await guild.channels.create({ name: catDef.name.trim().slice(0, 100), type: ChannelType.GuildCategory });
            created.push(`${cat.name} category`);
          } catch (error) {
            failed.push(`${catDef.name} category: ${error.message}`);
            continue;
          }
        }

        for (const chDef of (Array.isArray(catDef.channels) ? catDef.channels : [])) {
          const type = TYPE_MAP[chDef.type] ?? ChannelType.GuildText;
          const channelName = type === ChannelType.GuildText
            ? String(chDef.name ?? '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 100)
            : String(chDef.name ?? '').trim().slice(0, 100);
          if (!channelName) {
            failed.push(`channel under ${cat.name} with a missing name`);
            continue;
          }
          const existingMatch = findNamed(
            guild.channels.cache,
            channelName,
            'channel',
            candidate => candidate.parentId === cat.id && candidate.type === type,
            true,
          );
          if (existingMatch.error && !existingMatch.error.endsWith('not found')) {
            failed.push(`${channelName}: ${existingMatch.error}`);
            continue;
          }
          const existing = existingMatch.item;
          if (existing) {
            skipped.push(`#${existing.name}`);
            continue;
          }
          try {
            const options = { name: channelName, type, parent: cat.id };
            if (chDef.topic) options.topic = chDef.topic;
            const createdChannel = await guild.channels.create(options);
            created.push(type === ChannelType.GuildText ? `#${createdChannel.name}` : `🔊 ${createdChannel.name}`);
          } catch (error) {
            failed.push(`${channelName}: ${error.message}`);
          }
        }
      }
      return [
        created.length ? `created: ${created.join(', ')}` : 'created: nothing new',
        skipped.length ? `already existed: ${skipped.join(', ')}` : '',
        failed.length ? `errors: ${failed.join('; ')}` : '',
      ].filter(Boolean).join('\n');
    }
    if (name === 'kick_member') {
      const member = await guild.members.fetch(args.user_id).catch(() => null);
      if (!member) return `user not found`;
      if (!member.kickable) return `can't kick ${member.displayName} — role too high or missing perms`;
      const n = member.displayName;
      await member.kick(args.reason || 'No reason provided');
      return `kicked ${n}${args.reason ? ` (${args.reason})` : ''}`;
    }
    if (name === 'timeout_member') {
      const member = await guild.members.fetch(args.user_id).catch(() => null);
      if (!member) return `user not found`;
      if (!member.moderatable) return `can't timeout ${member.displayName} — role too high or missing perms`;
      const ms = Math.min(Math.max(args.minutes, 1), 40320) * 60 * 1000; // cap at 28 days
      await member.timeout(ms, args.reason || 'No reason provided');
      return `timed out ${member.displayName} for ${args.minutes} min`;
    }
    if (name === 'purge_messages') {
      if (!channel?.bulkDelete) return `can't purge here`;
      const amount = Math.min(Math.max(args.amount, 1), 100);
      const deleted = await channel.bulkDelete(amount, true).catch(() => null);
      if (!deleted) return `couldn't delete messages (may be older than 14 days)`;
      return `purged ${deleted.size} messages`;
    }
    if (name === 'send_embed') {
      if (!channel?.send) return `can't send here`;
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder().setDescription(args.description).setColor(args.color || '#5865F2');
      if (args.title) embed.setTitle(args.title);
      await channel.send({ embeds: [embed] });
      return `sent embed`;
    }
    if (name === 'pin_message') {
      if (!channel?.messages) return `can't pin here`;
      const msgs = await channel.messages.fetch({ limit: 2 });
      const target = msgs.filter(m => !m.pinned).first();
      if (!target) return `no message to pin`;
      await target.pin();
      return `pinned a message`;
    }
    if (name === 'delete_channel') {
      const match = findNamed(guild.channels.cache, args.name, 'channel', () => true, true);
      if (match.error) return `error: ${match.error}`;
      const ch = match.item;
      const n = ch.name; await ch.delete();
      return `deleted #${n}`;
    }
    if (name === 'edit_channel') {
      const match = findNamed(guild.channels.cache, args.current_name, 'channel');
      if (match.error) return `error: ${match.error}`;
      const ch = match.item;
      const opts = {};
      if (args.new_name) opts.name = args.new_name.toLowerCase().replace(/\s+/g, '-');
      if (args.topic !== undefined) opts.topic = args.topic;
      if (args.slowmode_seconds !== undefined) opts.rateLimitPerUser = Math.min(Math.max(args.slowmode_seconds, 0), 21600);
      await ch.edit(opts);
      return `updated #${opts.name || ch.name}`;
    }
    if (name === 'set_nickname') {
      const member = await guild.members.fetch(args.user_id).catch(() => null);
      if (!member) return `user not found`;
      if (!member.manageable) return `can't change ${member.displayName}'s nickname — role too high or missing perms`;
      await member.setNickname(args.nickname);
      return `set nickname to "${args.nickname}"`;
    }
    if (name === 'unban_member') {
      await guild.bans.remove(args.user_id).catch(() => { throw new Error('not banned or invalid ID'); });
      return `unbanned <@${args.user_id}>`;
    }
    return 'unknown tool';
  } catch (e) {
    return `error: ${e.message}`;
  }
}

// ─── Build compact server context ─────────────────────────────────────────────
function buildContext(guild, channel, displayName, userId, mentionedUsers, forActions) {
  const { ChannelType, PermissionFlagsBits } = require('discord.js');
  const base = `speaker: ${displayName} (<@${userId}>) | channel: #${channel.name}`;
  if (!forActions) return base; // chat-only messages get minimal context

  // For action messages, include structure so AI can match style
  const cats = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .map(cat => {
      const kids = guild.channels.cache
        .filter(c => c.parentId === cat.id)
        .map(c => (c.type === ChannelType.GuildVoice ? '🔊' : '#') + c.name)
        .join(', ');
      return `[${cat.name}]: ${kids || 'empty'}`;
    }).slice(0, 10).join(' | ');

  const roles = guild.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => `@${r.name}${r.hexColor !== '#000000' ? `(${r.hexColor})` : ''}`)
    .slice(0, 12).join(', ');

  const mentioned = mentionedUsers.length
    ? `mentioned: ${mentionedUsers.map(u => `${u.displayName}(<@${u.id}>)`).join(', ')}`
    : '';

  const botPermissions = guild.members.me?.permissions;
  const permissionSummary = botPermissions
    ? `bot permissions: Manage Channels ${botPermissions.has(PermissionFlagsBits.ManageChannels) ? 'yes' : 'no'}, Manage Roles ${botPermissions.has(PermissionFlagsBits.ManageRoles) ? 'yes' : 'no'}`
    : '';

  return [base, `server: ${guild.name}`, permissionSummary, cats && `structure: ${cats}`, roles && `roles: ${roles}`, mentioned]
    .filter(Boolean).join('\n');
}

// ─── Main Chat Function ───────────────────────────────────────────────────────
async function chat(channelId, userMessage, displayName, userId, mode, guild, channel, imageUrls = [], mentionedUsers = [], canDoActions = false) {
  // Fast, deterministic, zero-latency bypass — never goes through the model
  if (CREATOR_RE.test(userMessage)) {
    return 'I was made by @skydagoat20 and @yowspsky ✨';
  }

  if (!histories.has(channelId)) histories.set(channelId, []);
  const history = histories.get(channelId);

  const config     = getAiConfig();
  const FAST_MODEL   = config.fastModel;
  const SMART_MODEL  = config.smartModel;
  const VISION_MODEL = config.visionModel;

  const modeKey    = PROMPTS[mode] ? mode : 'casual';
  const systemMsg  = PROMPTS[modeKey] + '\n' + BASE_RULES;
  // Server and build modes are built specifically to take action — always attach tools
  const isAction   = ['server', 'build'].includes(modeKey) ? true : ACTION_RE.test(userMessage);
  const useSmarter = ['math', 'english', 'code', 'science', 'build', 'server', 'osint'].includes(modeKey);
  const model      = useSmarter ? SMART_MODEL : FAST_MODEL;
  if (guild && isAction) {
    await Promise.all([
      guild.channels.fetch().catch(() => null),
      guild.roles.fetch().catch(() => null),
    ]);
  }
  const contextStr = guild ? buildContext(guild, channel, displayName, userId, mentionedUsers, isAction) : `speaker: ${displayName} (<@${userId}>)`;

  // Build user content
  let userContent;
  if (imageUrls.length > 0) {
    // Store text-only placeholder in history to avoid token bloat on replays
    userContent = [
      { type: 'text', text: `[${contextStr}]\n${displayName}: ${userMessage || '(image)'}` },
      ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } })),
    ];
  } else {
    userContent = `[${contextStr}]\n${displayName}: ${userMessage}`;
  }

  // Add to history — for images store text placeholder only
  history.push({ role: 'user', content: imageUrls.length ? `[${contextStr}]\n${displayName}: ${userMessage || '(sent an image)'}` : userContent });
  while (history.length > MAX_HISTORY) history.shift();

  // Vision path (no tools — saves tokens and model doesn't support them)
  if (imageUrls.length > 0) {
    const visionMessages = [
      { role: 'system', content: systemMsg },
      ...history.slice(0, -1), // text history
      { role: 'user', content: userContent }, // actual image content
    ];
    let reply;
    try {
      const completion = await aiClient.chat.completions.create({
        model: VISION_MODEL,
        messages: visionMessages,
        max_tokens: 500,
        temperature: 0.6,
      });
      reply = completion.choices[0]?.message?.content ?? 'bruh idk 💀';
    } catch (e) {
      console.error('[AI Vision Err]', e.message);
      reply = 'my brain lagged looking at that 💀 try again in a sec';
    }
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY) history.shift();
    return reply;
  }

  // Temperature tuning for precision vs personality
  let temp = 0.75;
  if (['math', 'code', 'osint'].includes(modeKey)) temp = 0.2;
  else if (['build', 'server'].includes(modeKey)) temp = 0.25;
  else if (modeKey === 'science') temp = 0.3;
  else if (modeKey === 'english') temp = 0.5;

  // Token limits to prevent cut-offs in code, guides, or server setups
  let maxTokens = 500;
  if (modeKey === 'build') maxTokens = 2500;
  else if (['code', 'math', 'osint'].includes(modeKey)) maxTokens = 1500;
  else if (['science', 'english', 'server'].includes(modeKey)) maxTokens = 1000;

  // Text path — attach tools if user is allowed AND message looks like an action
  const callOpts = {
    model,
    messages: [{ role: 'system', content: systemMsg }, ...history],
    max_tokens: maxTokens,
    temperature: temp,
  };
  if (canDoActions && isAction && guild) {
    callOpts.tools       = getToolsForMode(modeKey);
    callOpts.tool_choice = 'auto';
  }

  let completion, msg;
  try {
    completion = await aiClient.chat.completions.create(callOpts);
    msg = completion.choices[0]?.message;
  } catch (e) {
    console.error(`[AI Chat Err ${modeKey}]`, e.message);
    return 'my brain lagged for a sec 💀 try that again';
  }

  // Handle tool calls
  if (msg?.tool_calls?.length) {
    history.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });
    const toolResults = [];
    for (const tc of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
      const result = await executeTool(tc.function.name, args, guild, channel);
      toolResults.push({ tool_call_id: tc.id, role: 'tool', content: result });
    }
    history.push(...toolResults);
    while (history.length > MAX_HISTORY) history.shift();

    // Follow-up reply after action — no tools this time
    try {
      completion = await aiClient.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemMsg }, ...history],
        max_tokens: 250,
        temperature: ['build', 'server'].includes(modeKey) ? 0.25 : 0.85,
      });
      msg = completion.choices[0]?.message;
    } catch (e) {
      msg = { content: `done ✅ (${toolResults.map(t => t.content).join(', ')})` };
    }
  }

  const reply = msg?.content ?? 'idk what happened 💀';
  history.push({ role: 'assistant', content: reply });
  while (history.length > MAX_HISTORY) history.shift();
  return reply;
}

function clearHistory(channelId) {
  histories.delete(channelId);
}

module.exports = { chat, clearHistory, executeTool, getToolsForMode, TOOLS };


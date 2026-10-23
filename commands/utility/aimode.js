const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info } = require('../../utils/embed');
const storage = require('../../utils/storage');
const { clearHistory, getAiProvider } = require('../../systems/groq');

const FILE = 'aimode.json';

// Storage format: { [channelId]: { enabled: bool, mode: string } }
// Handles legacy format where value was just `true`
function getData(channelId) {
  const val = storage.get(FILE, channelId, null);
  if (!val) return { enabled: false, mode: 'casual' };
  if (val === true) return { enabled: true, mode: 'casual' }; // legacy
  return { enabled: val.enabled ?? false, mode: val.mode ?? 'casual' };
}

function setData(channelId, enabled, mode) {
  storage.set(FILE, channelId, enabled ? { enabled: true, mode: mode ?? 'casual' } : null);
}

const MODE_INFO = {
  chill:   { emoji: '😌', label: 'Chill',   desc: 'Relaxed, laid back vibes. Late night energy.' },
  roast:   { emoji: '🔥', label: 'Roast',   desc: 'Savage mode. Short punchy roasts, swears when it lands.' },
  casual:  { emoji: '💬', label: 'Casual',  desc: 'Normal friendly convo. Real talk, no attitude.' },
  math:    { emoji: '🔢', label: 'Math',    desc: 'Step-by-step math help. Casual but accurate.' },
  english: { emoji: '📝', label: 'English', desc: 'Writing, grammar, essays, vocab. Real feedback.' },
  code:    { emoji: '💻', label: 'Code',    desc: 'Coding help. Any language, casual explanations.' },
  science: { emoji: '🔬', label: 'Science', desc: 'Physics, chem, bio, space — made actually interesting.' },
  gf:      { emoji: '🥰', label: 'GF',      desc: 'Sweet, caring, playful and a little flirty.' },
  build:   { emoji: '🏗️', label: 'Build',   desc: 'Plans and builds Discord server layouts with categories, channels, and starter roles.' },
  server:  { emoji: '🛠️', label: 'Server',  desc: 'Server manager mode — creates channels/roles, kicks/bans, does tasks on command like staff.' },
};

module.exports = {
  name: 'aimode',
  description: 'Toggle or switch AI chat mode in a channel',
  aliases: ['aimodeon', 'aimodeoff', 'chillmode', 'roastmode', 'casualmode', 'mathmode', 'englishmode', 'codemode', 'sciencemode', 'gfmode', 'buildmode', 'servermode', 'ai'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('aimode')
      .setDescription('Control unitClan AI mode in this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addSubcommand(s => s.setName('on').setDescription('Turn AI on (casual mode)'))
      .addSubcommand(s => s.setName('off').setDescription('Turn AI off'))
      .addSubcommand(s => s.setName('chill').setDescription('Switch to chill mode 😌'))
      .addSubcommand(s => s.setName('roast').setDescription('Switch to roast mode 🔥'))
      .addSubcommand(s => s.setName('casual').setDescription('Switch to casual mode 💬'))
      .addSubcommand(s => s.setName('math').setDescription('Switch to math tutor mode 🔢'))
      .addSubcommand(s => s.setName('english').setDescription('Switch to English/writing mode 📝'))
      .addSubcommand(s => s.setName('code').setDescription('Switch to coding help mode 💻'))
      .addSubcommand(s => s.setName('science').setDescription('Switch to science mode 🔬'))
      .addSubcommand(s => s.setName('gf').setDescription('Switch to girlfriend mode 🥰'))
      .addSubcommand(s => s.setName('build').setDescription('Build Discord server layouts safely 🏗️'))
      .addSubcommand(s => s.setName('server').setDescription('Switch to server manager mode 🛠️'))
      .addSubcommand(s => s.setName('status').setDescription('Check current AI mode'))
      .addSubcommand(s => s.setName('provider').setDescription('Show the configured AI provider'))
      .addSubcommand(s => s.setName('reset').setDescription('Clear conversation history')),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    if (!isSlash && !source.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply({ embeds: [error(client, 'No Permission', 'Need **Manage Channels** to mess with AI mode.')] });
    }

    const channelId      = isSlash ? source.channelId : source.channel.id;
    const channelMention = `<#${channelId}>`;
    const data           = getData(channelId);

    // Determine action
    let sub;
    if (isSlash) {
      sub = source.options.getSubcommand();
    } else {
      const typed = source.content.slice(1).trim().split(/\s+/)[0].toLowerCase();
      if      (typed === 'aimodeon')    sub = 'on';
      else if (typed === 'aimodeoff')   sub = 'off';
      else if (typed === 'chillmode')   sub = 'chill';
      else if (typed === 'roastmode')   sub = 'roast';
      else if (typed === 'casualmode')  sub = 'casual';
      else if (typed === 'mathmode')    sub = 'math';
      else if (typed === 'englishmode') sub = 'english';
      else if (typed === 'codemode')    sub = 'code';
      else if (typed === 'sciencemode') sub = 'science';
      else if (typed === 'gfmode')      sub = 'gf';
      else if (typed === 'buildmode')   sub = 'build';
      else if (typed === 'servermode')  sub = 'server';
      else sub = (args[0] ?? 'status').toLowerCase();
    }

    // Mode switch commands
    if (['chill', 'roast', 'casual', 'math', 'english', 'code', 'science', 'gf', 'build', 'server'].includes(sub)) {
      const m = MODE_INFO[sub];
      setData(channelId, true, sub);
      clearHistory(channelId);
      return reply({ embeds: [success(client, `${m.emoji} ${m.label} Mode`, `${channelMention} switched to **${m.label} mode**.\n${m.desc}\n\nHistory cleared — fresh start.`)] });
    }

    if (sub === 'on') {
      if (data.enabled) {
        const m = MODE_INFO[data.mode] ?? MODE_INFO.casual;
        return reply({ embeds: [info(client, '🤖 AI Mode', [], `Already on in ${channelMention} (${m.emoji} **${m.label}** mode).`)] });
      }
      setData(channelId, true, data.mode ?? 'casual');
      clearHistory(channelId);
      const m = MODE_INFO[data.mode ?? 'casual'];
      return reply({ embeds: [success(client, '🤖 AI Mode On', `AI enabled in ${channelMention} — **${m.emoji} ${m.label}** mode.\nUse \`?buildmode\` to build a Discord layout, or \`?aimode <mode>\` to switch.`)] });
    }

    if (sub === 'off') {
      if (!data.enabled) {
        return reply({ embeds: [info(client, '🤖 AI Mode', [], `AI is already off in ${channelMention}.`)] });
      }
      setData(channelId, false, data.mode);
      clearHistory(channelId);
      return reply({ embeds: [success(client, '🤖 AI Mode Off', `AI disabled in ${channelMention}. History cleared.`)] });
    }

    if (sub === 'reset') {
      clearHistory(channelId);
      return reply({ embeds: [success(client, '🧹 History Cleared', `Convo history for ${channelMention} wiped.`)] });
    }

    if (sub === 'provider') {
      const provider = getAiProvider();
      return reply({ embeds: [info(client, '🧠 AI Provider', [], 'Configured provider: **' + (provider === 'mistral' ? 'Mistral' : 'Groq') + '**. Set MISTRAL_API_KEY in the bot host environment to use Mistral.')] });
    }

    // status
    if (data.enabled) {
      const m = MODE_INFO[data.mode] ?? MODE_INFO.casual;
      return reply({ embeds: [info(client, '🤖 AI Mode Status', [], `${channelMention}: **ON** — ${m.emoji} **${m.label}** mode\n${m.desc}\n\nUse \`?aimode <mode>\` to switch modes.`)] });
    }
    return reply({ embeds: [info(client, '🤖 AI Mode Status', [], `${channelMention}: **OFF**\nUse \`?aimodeon\` or \`?chillmode\`/\`?roastmode\`/\`?casualmode\` to enable.`)] });
  },
};




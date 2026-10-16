const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { error, panel } = require('../../utils/embed');
const storage = require('../../utils/storage');

// Re-use all the heavy logic from paste.js
const { applyServerSnap, resolveOverwrites, sleep } = (() => {
  // We load the paste module's internals via a shared helper file
  // But since they're not exported, we duplicate the minimal glue here
  // and delegate to runPaste via a thin wrapper instead.
  return {};
})();

// ── This command is a clean direct alias for ?paste server ───────────────────
// It reads the server clipboard and applies it here (or to an invite target)
// without making the user remember the "server" argument.

const INVITE_RE = /(?:https?:\/\/)?(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9\-]+)/;

module.exports = {
  name: 'pasteserver',
  description: 'Paste your ?copyserver clipboard into this (or another) server',
  aliases: ['serverpaste', 'applyserver'],
  cooldown: 10,
  slash: {
    data: new SlashCommandBuilder()
      .setName('pasteserver')
      .setDescription('Apply your ?copyserver snapshot to this server (or another via invite)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(o =>
        o.setName('invite').setDescription('Target server invite link (optional — defaults to current server)'))
      .addBooleanOption(o =>
        o.setName('confirm').setDescription('Skip confirmation and apply immediately')),
  },

  async execute(source, args, client) {
    // Delegate entirely to ?paste with typeArg forced to 'server'
    // We do this by injecting into the paste command's execute directly
    const paste = client.prefixCommands.get('paste');
    if (!paste) return;

    // Reconstruct args so paste sees 'server' as the type
    const isSlash     = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const inviteArg   = isSlash ? source.options.getString('invite') : args.find(a => INVITE_RE.test(a));
    const confirmArg  = isSlash ? (source.options.getBoolean('confirm') ?? false) : args.some(a => a.toLowerCase() === 'confirm');

    const fakeArgs = ['server'];
    if (inviteArg)  fakeArgs.push(inviteArg);
    if (confirmArg) fakeArgs.push('confirm');

    // Wrap interaction so slash options map correctly
    if (isSlash) {
      // For slash, we need a compatible source — just run the logic inline
      const userId  = source.user.id;
      const sendNew = opts => source.channel.send(opts);
      const reply   = opts => source.reply(opts);

      if (!source.member.permissions.has(PermissionFlagsBits.Administrator))
        return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator**.')], ephemeral: true });

      const clip = storage.get('clipboard.json', userId, {});
      if (!clip.server)
        return reply({ embeds: [error(client, 'No Server Snapshot', 'Use `?copyserver` first, then come back and run this.')], ephemeral: true });

      // Forward to paste's execute with synthesised prefix-style args
      await paste.execute(source, fakeArgs, client);
    } else {
      await paste.execute(source, fakeArgs, client);
    }
  },
};

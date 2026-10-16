const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const { info } = require('../../utils/embed');

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function genPassword(len) {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += CHARS[bytes[i] % CHARS.length];
  return out;
}

module.exports = {
  name: 'password',
  description: 'Generate a secure random password',
  aliases: ['genpass', 'pwgen'],
  cooldown: 3,
  slash: {
    data: new SlashCommandBuilder()
      .setName('password')
      .setDescription('Generate a secure random password')
      .addIntegerOption(o => o.setName('length').setDescription('Password length (8-64, default 16)').setRequired(false)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    let len = isSlash ? source.options.getInteger('length') : parseInt(args[0], 10);
    if (!len || isNaN(len)) len = 16;
    len = Math.min(Math.max(len, 8), 64);

    const pw = genPassword(len);
    await reply({ embeds: [info(client, '🔐 Generated Password', [], `\`\`\`${pw}\`\`\`\nSent here — delete this message after copying it if this channel isn't private.`)], ephemeral: isSlash });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const { profile, SEP, COLORS } = require('../../utils/embed');
const cfg = require('../../config.json');

module.exports = {
  name: 'servers',
  description: 'Show how many servers the bot is in',
  aliases: ['guilds', 'servercount'],
  cooldown: 5,
  slash: { data: new SlashCommandBuilder().setName('servers').setDescription('Show how many servers the bot is in') },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = async opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    const guilds  = client.guilds.cache;
    const count   = guilds.size;
    const members = guilds.reduce((sum, g) => sum + (g.memberCount ?? 0), 0);

    await reply({
      embeds: [
        profile(
          client,
          '🌐 Servers',
          [
            { name: '🌐 Servers',  value: `\`${count}\``,                          inline: true },
            { name: '👥 Members',  value: `\`${members.toLocaleString('en-US')}\``, inline: true },
            { name: '💠 Shards',   value: `\`${client.ws.shards.size}\``,           inline: true },
          ],
          `${SEP}\nunitClan ${cfg.version} · serving ${count} server${count === 1 ? '' : 's'}`,
          client.user.displayAvatarURL({ size: 256 }),
          COLORS.purple,
        ),
      ],
    });
  },
};


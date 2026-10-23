const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { TEMPLATES } = require('../../systems/server-builder');

const choices = Object.entries(TEMPLATES)
  .map(([key, template]) => `**${key}** — ${template.description}\nRoles: ${template.roles.length} · Categories: ${template.categories.length}`)
  .join('\n\n');

module.exports = {
  name: 'templates',
  description: 'List available server setup templates',
  aliases: ['servertemplates', 'layouttemplates'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('templates')
      .setDescription('List available server setup templates'),
  },
  async execute(source, args, client) {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Server setup templates')
      .setDescription(`${choices}\n\nRun \`?serverbuild <name>\` or \`/serverbuild\` to add one. Existing channels and roles are left unchanged.`)
      .setFooter({ text: `unitClan ${require('../../config.json').version}`, iconURL: client.user.displayAvatarURL() });
    if (typeof source.isChatInputCommand === 'function' && source.isChatInputCommand()) {
      return source.reply({ embeds: [embed] });
    }
    return source.channel.send({ embeds: [embed] });
  },
};



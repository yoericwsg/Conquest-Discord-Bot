const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { isApplicationOwner } = require('../../systems/owner-access');
const { setDowntimeBy } = require('../../systems/maintenance');
const { error, success } = require('../../utils/embed');

module.exports = {
  name: 'downtimeby',
  description: 'Set the displayed team rank on downtime announcements',
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('downtimeby')
      .setDescription('Set your displayed team rank on downtime notices (bot DMs only)')
      .setContexts(InteractionContextType.BotDM)
      .addStringOption(o => o.setName('rank').setDescription('For example: Dev, Developer, Owner').setMaxLength(40).setRequired(true)),
  },
  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const actor = source.user ?? source.author;
    const reply = payload => isSlash ? source.reply(payload) : source.channel.send(payload);
    if (source.guild) return reply({ content: 'Run this command in Conquest’s DMs.' });
    if (!await isApplicationOwner(client, actor.id)) {
      return reply({ content: 'This command is restricted to the verified Conquest application owner/team.' });
    }

    const label = (isSlash ? source.options.getString('rank') : args.join(' ')).trim();
    if (!label || label.length > 40 || /[@<>`\n\r]/.test(label)) {
      return reply({ embeds: [error(client, 'Usage', 'Set a plain-text display label with `?downtimeby Dev`, `?downtimeby Owner`, or `/downtimeby rank:Developer`. This changes only the name shown in notices, not who can use the command.')] });
    }
    setDowntimeBy(label);
    return reply({ embeds: [success(client, 'Downtime label updated', `Future downtime notices will show **${label}** as your team rank. Command access remains restricted to the application owner/team.`)] });
  },
};

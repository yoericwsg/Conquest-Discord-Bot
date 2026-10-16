const {
  SlashCommandBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { base, success, error, panel, warning } = require('../../utils/embed');
const storage = require('../../utils/storage');

module.exports = {
  name: 'suggest',
  description: 'Submit a suggestion or manage the suggestions channel',
  aliases: ['suggestion'],
  cooldown: 30,
  slash: {
    data: new SlashCommandBuilder()
      .setName('suggest')
      .setDescription('Submit a suggestion to the server')
      .addSubcommand(s =>
        s.setName('submit')
          .setDescription('Submit a suggestion')
          .addStringOption(o => o.setName('text').setDescription('Your suggestion').setRequired(true)))
      .addSubcommand(s =>
        s.setName('channel')
          .setDescription('Set the suggestions channel (Admin only)')
          .addChannelOption(o => o.setName('channel').setDescription('The suggestions channel').setRequired(true)))
      .addSubcommand(s =>
        s.setName('approve')
          .setDescription('Approve a suggestion (Admin only)')
          .addStringOption(o => o.setName('message_id').setDescription('Suggestion message ID').setRequired(true))
          .addStringOption(o => o.setName('reason').setDescription('Approval reason').setRequired(false)))
      .addSubcommand(s =>
        s.setName('deny')
          .setDescription('Deny a suggestion (Admin only)')
          .addStringOption(o => o.setName('message_id').setDescription('Suggestion message ID').setRequired(true))
          .addStringOption(o => o.setName('reason').setDescription('Denial reason').setRequired(false))),
  },
  async execute(source, args, client) {
    const isSlash  = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const guild    = source.guild;
    const user     = isSlash ? source.user : source.author;
    const member   = source.member;

    const reply = opts => source.reply?.(opts) ?? source.channel.send(opts);

    const sub = isSlash ? source.options.getSubcommand() : (args[0] ?? 'submit');

    // ── SET CHANNEL ────────────────────────────────────────────────────────────
    if (sub === 'channel') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator))
        return reply({ embeds: [error(client, 'No Permission', 'You need **Administrator**.')] });
      const ch = isSlash ? source.options.getChannel('channel') : source.mentions.channels.first();
      if (!ch) return reply({ embeds: [error(client, 'Missing Channel', 'Mention a channel.')] });
      const cfg = storage.get('configs.json', guild.id, {});
      cfg.suggestChannel = ch.id;
      storage.set('configs.json', guild.id, cfg);
      return reply({ embeds: [success(client, '✅  Suggestions Channel Set', `Suggestions will be posted in <#${ch.id}>.`)] });
    }

    // ── SUBMIT ─────────────────────────────────────────────────────────────────
    if (sub === 'submit') {
      const text = isSlash ? source.options.getString('text') : args.join(' ');
      if (!text) return reply({ embeds: [error(client, 'Missing Text', 'Provide your suggestion.')] });

      const cfg = storage.get('configs.json', guild.id, {});
      const channelId = cfg.suggestChannel;
      if (!channelId) return reply({ embeds: [error(client, 'Not Configured', 'An admin needs to set a suggestions channel with `?suggest channel #channel` first.')] });

      const ch = guild.channels.cache.get(channelId);
      if (!ch) return reply({ embeds: [error(client, 'Channel Gone', 'The suggestions channel no longer exists. Ask an admin to reconfigure it.')] });

      const embed = base(client)
        .setColor('#FEE75C')
        .setTitle('💡  New Suggestion')
        .setDescription(text)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setFooter({ text: `Suggestion by ${user.id}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_approve').setLabel('✅  Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('suggest_deny').setLabel('❌  Deny').setStyle(ButtonStyle.Danger),
      );

      const msg = await ch.send({ embeds: [embed], components: [row] });
      await msg.react('👍').catch(() => null);
      await msg.react('👎').catch(() => null);

      return reply({ embeds: [success(client, '✅  Suggestion Submitted', `Your suggestion has been posted in <#${ch.id}>.`)], ephemeral: isSlash });
    }

    // ── APPROVE / DENY ─────────────────────────────────────────────────────────
    if (sub === 'approve' || sub === 'deny') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
        return reply({ embeds: [error(client, 'No Permission', 'You need **Manage Messages**.')] });

      const msgId  = isSlash ? source.options.getString('message_id') : args[1];
      const reason = isSlash ? (source.options.getString('reason') ?? 'No reason provided') : args.slice(2).join(' ') || 'No reason provided';

      if (!msgId) return reply({ embeds: [error(client, 'Missing ID', 'Provide the suggestion message ID.')] });

      const cfg = storage.get('configs.json', guild.id, {});
      const ch  = cfg.suggestChannel ? guild.channels.cache.get(cfg.suggestChannel) : source.channel;
      if (!ch)  return reply({ embeds: [error(client, 'Channel Not Found', 'Could not find the suggestions channel.')] });

      let msg;
      try { msg = await ch.messages.fetch(msgId); }
      catch { return reply({ embeds: [error(client, 'Message Not Found', 'Could not fetch that message.')] }); }

      const approved  = sub === 'approve';
      const oldEmbed  = msg.embeds[0];
      const newEmbed  = base(client)
        .setColor(approved ? '#57F287' : '#ED4245')
        .setTitle(approved ? '✅  Suggestion Approved' : '❌  Suggestion Denied')
        .setDescription(oldEmbed?.description ?? '*[no content]*')
        .addFields({ name: approved ? 'Approved by' : 'Denied by', value: `${user.tag}\n**Reason:** ${reason}` })
        .setTimestamp();

      await msg.edit({ embeds: [newEmbed], components: [] });
      return reply({ embeds: [success(client, `Suggestion ${approved ? 'Approved' : 'Denied'}`, `Updated the suggestion in <#${ch.id}>.`)], ephemeral: isSlash });
    }
  },
};

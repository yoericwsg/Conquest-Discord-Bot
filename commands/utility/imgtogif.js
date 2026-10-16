const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { error, info } = require('../../utils/embed');

async function convertToGif(url) {
  const sharp = require('sharp');
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to download image');
  const buffer = Buffer.from(await res.arrayBuffer());
  return sharp(buffer).gif().toBuffer();
}

function findImageUrl(source, isSlash) {
  if (isSlash) {
    const att = source.options.getAttachment('image');
    return att?.url ?? null;
  }
  // Prefix: attachment on the message itself, or on the message being replied to
  const direct = [...source.attachments.values()].find(a => a.contentType?.startsWith('image/'));
  if (direct) return direct.url;
  return null;
}

module.exports = {
  name: 'imgtogif',
  description: 'Convert an image into a GIF',
  aliases: ['imagetogif', 'togif'],
  cooldown: 5,
  slash: {
    data: new SlashCommandBuilder()
      .setName('imgtogif')
      .setDescription('Convert an image into a GIF')
      .addAttachmentOption(o => o.setName('image').setDescription('Image to convert').setRequired(true)),
  },

  async execute(source, args, client) {
    const isSlash = typeof source.isChatInputCommand === 'function' && source.isChatInputCommand();
    const reply   = opts => isSlash ? source.reply(opts) : source.channel.send(opts);

    let imageUrl = findImageUrl(source, isSlash);

    // Prefix usage: check the replied-to message for an attachment
    if (!isSlash && !imageUrl && source.reference) {
      const refMsg = await source.channel.messages.fetch(source.reference.messageId).catch(() => null);
      const refAtt = refMsg && [...refMsg.attachments.values()].find(a => a.contentType?.startsWith('image/'));
      if (refAtt) imageUrl = refAtt.url;
    }

    if (!imageUrl) {
      return reply({ embeds: [error(client, 'No Image Found',
        isSlash ? 'Attach an image to convert.' : 'Attach an image with `?imgtogif`, or reply to a message that has one.')] });
    }

    const wait = isSlash ? await source.deferReply() : await source.channel.send({ embeds: [info(client, '⏳ Converting...', [], 'Turning that image into a GIF, one sec.')] });

    try {
      const gifBuffer = await convertToGif(imageUrl);
      const file = new AttachmentBuilder(gifBuffer, { name: 'converted.gif' });
      if (isSlash) {
        await source.editReply({ content: '✅ Here\'s your GIF:', files: [file] });
      } else {
        await wait.delete().catch(() => null);
        await source.channel.send({ content: '✅ Here\'s your GIF:', files: [file] });
      }
    } catch (e) {
      const failMsg = { embeds: [error(client, 'Conversion Failed', `Couldn't convert that image: ${e.message}`)] };
      if (isSlash) await source.editReply(failMsg);
      else { await wait.delete().catch(() => null); await source.channel.send(failMsg); }
    }
  },
};

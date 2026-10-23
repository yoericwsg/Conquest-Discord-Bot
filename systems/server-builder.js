const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TEMPLATES = {
  community: {
    label: 'Community',
    description: 'A general-purpose community server.',
    roles: [
      { name: 'Member', color: '#5865F2' },
      { name: 'Moderator', color: '#57F287', hoist: true },
    ],
    categories: [
      {
        name: 'START HERE',
        channels: [
          { name: 'welcome', topic: 'Say hello to new members.' },
          { name: 'rules', topic: 'Read the community rules.' },
          { name: 'announcements', topic: 'Official server updates.' },
        ],
      },
      {
        name: 'COMMUNITY',
        channels: [
          { name: 'general', topic: 'The main community chat.' },
          { name: 'introductions', topic: 'Introduce yourself to the community.' },
          { name: 'media', topic: 'Share pictures, clips, and other media.' },
          { name: 'suggestions', topic: 'Share ideas for improving the server.' },
        ],
      },
      {
        name: 'VOICE',
        channels: [
          { name: 'General Voice', type: 'voice' },
          { name: 'Chill Voice', type: 'voice' },
        ],
      },
    ],
  },
  gaming: {
    label: 'Gaming',
    description: 'A server for gaming groups and finding teammates.',
    roles: [
      { name: 'Gamer', color: '#5865F2' },
      { name: 'Moderator', color: '#57F287', hoist: true },
    ],
    categories: [
      {
        name: 'START HERE',
        channels: [
          { name: 'welcome', topic: 'Welcome new players.' },
          { name: 'rules', topic: 'Read the server rules.' },
          { name: 'announcements', topic: 'Server and community updates.' },
        ],
      },
      {
        name: 'GAMING',
        channels: [
          { name: 'general', topic: 'General gaming chat.' },
          { name: 'looking-for-group', topic: 'Find people to play with.' },
          { name: 'clips-and-highlights', topic: 'Share your best moments.' },
          { name: 'game-chat', topic: 'Talk about games and updates.' },
        ],
      },
      {
        name: 'VOICE',
        channels: [
          { name: 'Squad One', type: 'voice' },
          { name: 'Squad Two', type: 'voice' },
          { name: 'AFK', type: 'voice' },
        ],
      },
    ],
  },
  study: {
    label: 'Study',
    description: 'A study server for questions, resources, and focus sessions.',
    roles: [
      { name: 'Student', color: '#5865F2' },
      { name: 'Tutor', color: '#57F287', hoist: true },
    ],
    categories: [
      {
        name: 'START HERE',
        channels: [
          { name: 'welcome', topic: 'Welcome to the study group.' },
          { name: 'rules', topic: 'Read the study group guidelines.' },
          { name: 'resources', topic: 'Useful links and study materials.' },
        ],
      },
      {
        name: 'STUDY HALL',
        channels: [
          { name: 'study-chat', topic: 'General study discussion.' },
          { name: 'questions', topic: 'Ask for help with a subject.' },
          { name: 'accountability', topic: 'Share goals and progress.' },
        ],
      },
      {
        name: 'VOICE',
        channels: [
          { name: 'Study Room One', type: 'voice' },
          { name: 'Study Room Two', type: 'voice' },
        ],
      },
    ],
  },
  creator: {
    label: 'Creator',
    description: 'A server for sharing creative work and updates.',
    roles: [
      { name: 'Member', color: '#5865F2' },
      { name: 'Creator', color: '#FEE75C', hoist: true },
      { name: 'Moderator', color: '#57F287', hoist: true },
    ],
    categories: [
      {
        name: 'START HERE',
        channels: [
          { name: 'welcome', topic: 'Welcome to the creator community.' },
          { name: 'rules', topic: 'Read the community rules.' },
          { name: 'announcements', topic: 'Creator and server updates.' },
        ],
      },
      {
        name: 'COMMUNITY',
        channels: [
          { name: 'general', topic: 'General conversation.' },
          { name: 'introductions', topic: 'Introduce yourself and your work.' },
          { name: 'work-in-progress', topic: 'Share work in progress and get feedback.' },
          { name: 'showcase', topic: 'Share finished creative projects.' },
        ],
      },
      {
        name: 'VOICE',
        channels: [{ name: 'Creator Hangout', type: 'voice' }],
      },
    ],
  },
};

const CHANNEL_TYPES = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
};

function cleanTextChannelName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function findByName(collection, name, predicate = () => true) {
  const target = String(name).trim().toLowerCase();
  return collection.find(item => predicate(item) && item.name.toLowerCase() === target);
}

async function createServerFromTemplate(guild, templateKey) {
  const template = TEMPLATES[String(templateKey).toLowerCase()];
  if (!template) {
    throw new Error(`Unknown template "${templateKey}". Choose: ${Object.keys(TEMPLATES).join(', ')}.`);
  }

  const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
  if (!botMember) throw new Error('I could not check my server permissions. Please try again.');

  const missingPermissions = [];
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) missingPermissions.push('Manage Channels');
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) missingPermissions.push('Manage Roles');
  if (missingPermissions.length) {
    throw new Error(`Give the bot these permissions first: ${missingPermissions.join(' and ')}.`);
  }

  await Promise.all([
    guild.channels.fetch().catch(() => null),
    guild.roles.fetch().catch(() => null),
  ]);

  const result = { created: [], skipped: [], failed: [] };

  for (const roleSpec of template.roles) {
    const existing = findByName(guild.roles.cache, roleSpec.name);
    if (existing) {
      result.skipped.push(`@${existing.name}`);
      continue;
    }
    try {
      const role = await guild.roles.create({
        name: roleSpec.name,
        color: roleSpec.color,
        hoist: Boolean(roleSpec.hoist),
        reason: `unitClan ${template.label} server template`,
      });
      result.created.push(`@${role.name}`);
    } catch (error) {
      result.failed.push(`@${roleSpec.name}: ${error.message}`);
    }
  }

  for (const categorySpec of template.categories) {
    let category = findByName(
      guild.channels.cache,
      categorySpec.name,
      channel => channel.type === ChannelType.GuildCategory,
    );

    if (category) {
      result.skipped.push(`${category.name} category`);
    } else {
      try {
        category = await guild.channels.create({
          name: categorySpec.name,
          type: ChannelType.GuildCategory,
          reason: `unitClan ${template.label} server template`,
        });
        result.created.push(`${category.name} category`);
      } catch (error) {
        result.failed.push(`${categorySpec.name} category: ${error.message}`);
        continue;
      }
    }

    for (const channelSpec of categorySpec.channels) {
      const type = CHANNEL_TYPES[channelSpec.type ?? 'text'];
      const channelName = type === ChannelType.GuildText
        ? cleanTextChannelName(channelSpec.name)
        : channelSpec.name;
      const existing = findByName(
        guild.channels.cache,
        channelName,
        channel => channel.parentId === category.id && channel.type === type,
      );
      if (existing) {
        result.skipped.push(`#${existing.name}`);
        continue;
      }

      try {
        const options = {
          name: channelName,
          type,
          parent: category.id,
          reason: `unitClan ${template.label} server template`,
        };
        if (channelSpec.topic) options.topic = channelSpec.topic;
        const channel = await guild.channels.create(options);
        result.created.push(type === ChannelType.GuildText ? `#${channel.name}` : `🔊 ${channel.name}`);
      } catch (error) {
        result.failed.push(`${channelName}: ${error.message}`);
      }
    }
  }

  return { ...result, template: template.label };
}

module.exports = { TEMPLATES, createServerFromTemplate, cleanTextChannelName };

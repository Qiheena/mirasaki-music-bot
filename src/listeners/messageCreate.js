const logger = require('@mirasaki/logger');
const chalk = require('chalk');
const { getGuildSettings } = require('../modules/db');
const { getPermissionLevel } = require('../handlers/permissions');
const { clientConfig } = require('../util');

module.exports = async (client, message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const { member, guild, channel, content, author } = message;
  const { commands } = client.container;
  const { ownerId } = clientConfig.permissions;

  let prefix;
  let commandName;
  let args = [];

  const isOwner = author.id === ownerId;
  
  if (isOwner) {
    const words = content.trim().split(/\s+/);
    commandName = words[0].toLowerCase();
    args = words.slice(1);
    
    if (!commands.has(commandName)) {
      const settings = getGuildSettings(guild.id);
      prefix = settings.prefix;
      
      if (content.startsWith(prefix)) {
        commandName = content.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
        args = content.slice(prefix.length).trim().split(/\s+/).slice(1);
      } else {
        return;
      }
    }
  } else {
    const settings = getGuildSettings(guild.id);
    prefix = settings.prefix;

    if (!content.startsWith(prefix)) return;

    const words = content.slice(prefix.length).trim().split(/\s+/);
    commandName = words[0].toLowerCase();
    args = words.slice(1);
  }

  const command = commands.get(commandName);
  if (!command) return;

  const permLevel = getPermissionLevel(clientConfig, member, channel);

  const mockInteraction = {
    type: 2,
    commandName,
    customId: commandName,
    member,
    guild,
    channel,
    user: author,
    client,
    options: {
      getString: (name) => {
        const value = args.join(' ');
        return value || null;
      },
      getInteger: (name) => {
        const value = parseInt(args[0]);
        return isNaN(value) ? null : value;
      },
      getBoolean: (name) => {
        const value = args[0]?.toLowerCase();
        if (value === 'true' || value === 'yes' || value === '1') return true;
        if (value === 'false' || value === 'no' || value === '0') return false;
        return null;
      },
      getUser: (name) => {
        const mention = args[0];
        if (!mention) return null;
        const userId = mention.replace(/[<@!>]/g, '');
        return guild.members.cache.get(userId)?.user || null;
      },
      getChannel: (name) => {
        const mention = args[0];
        if (!mention) return null;
        const channelId = mention.replace(/[<#>]/g, '');
        return guild.channels.cache.get(channelId) || null;
      },
      getRole: (name) => {
        const mention = args[0];
        if (!mention) return null;
        const roleId = mention.replace(/[<@&>]/g, '');
        return guild.roles.cache.get(roleId) || null;
      },
      data: []
    },
    reply: async (payload) => {
      const content = typeof payload === 'string' ? payload : payload.content;
      const embeds = payload.embeds || [];
      const components = payload.components || [];
      const files = payload.files || [];
      
      return await message.reply({ content, embeds, components, files });
    },
    editReply: async (payload) => {
      const sent = await message.channel.messages.fetch({ limit: 1 });
      const lastMessage = sent.first();
      if (lastMessage && lastMessage.author.id === client.user.id) {
        return await lastMessage.edit(payload);
      }
      return await message.reply(payload);
    },
    deferReply: async () => {
      await message.channel.sendTyping();
    },
    followUp: async (payload) => {
      return await message.channel.send(payload);
    },
    isCommand: () => true,
    isChatInputCommand: () => true
  };

  mockInteraction.member.permLevel = permLevel;

  try {
    const aliasTag = command.isAlias ? `(Alias for: ${command.aliasFor})` : '';
    console.log([
      `${logger.timestamp()} ${chalk.white('[PREFIX]')}: ${chalk.bold(commandName)} ${aliasTag}`,
      guild.name,
      `#${channel.name}`,
      author.username
    ].join(chalk.magentaBright(` ${client.container.emojis.separator} `)));

    await command.run(client, mockInteraction);
  } catch (error) {
    logger.syserr('Error executing prefix command:');
    console.error(error);
    message.reply(`${client.container.emojis.error} An error occurred while executing the command.`);
  }
};

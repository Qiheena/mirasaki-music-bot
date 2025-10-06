const logger = require('@mirasaki/logger');
const chalk = require('chalk');
const { getGuildSettings } = require('../modules/db');
const { getPermissionLevel } = require('../handlers/permissions');
const { clientConfig, formatBotMessage } = require('../util');

const scheduleAutoDelete = (msg, settings) => {
  if (!settings.autoDeleteDuration || settings.autoDeleteDuration <= 0) return;
  
  setTimeout(() => {
    msg.delete().catch(() => {});
  }, settings.autoDeleteDuration * 1000);
};

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

  let command = commands.get(commandName);
  if (!command) {
    const aliasCommand = Array.from(commands.values()).find(cmd => 
      cmd.aliases && cmd.aliases.includes(commandName)
    );
    if (!aliasCommand) return;
    command = aliasCommand;
  }

  const actualCommandName = command.isAlias && command.aliasFor ? command.aliasFor : commandName;
  if (command.isAlias && command.aliasFor) {
    command = commands.get(command.aliasFor) || command;
  }

  const permLevel = getPermissionLevel(clientConfig, member, channel);

  const subcommand = args[0] && command.data.options?.find(opt => opt.type === 1 && opt.name === args[0].toLowerCase());
  const effectiveOptions = subcommand ? subcommand.options : command.data.options;
  const effectiveArgs = subcommand ? args.slice(1) : args;
  
  const getArgByOption = (name, type) => {
    if (!effectiveOptions) {
      if (type === 'string') return effectiveArgs.join(' ') || null;
      if (type === 'integer') {
        const value = parseInt(effectiveArgs[0]);
        return Number.isNaN(value) ? null : value;
      }
      if (type === 'boolean') {
        const val = effectiveArgs[0]?.toLowerCase();
        if (val === 'true' || val === 'yes' || val === '1') return true;
        if (val === 'false' || val === 'no' || val === '0') return false;
        return null;
      }
      return null;
    }
    
    const option = effectiveOptions.find(opt => opt.name === name);
    if (!option) return null;
    
    const index = effectiveOptions.indexOf(option);
    
    if (type === 'string') {
      if (option.type === 3) {
        const hasMoreOptions = index < effectiveOptions.length - 1;
        if (!hasMoreOptions) {
          return effectiveArgs.slice(index).join(' ') || null;
        }
        return effectiveArgs[index] || null;
      }
      return effectiveArgs[index] || null;
    }
    
    if (type === 'integer') {
      const value = parseInt(effectiveArgs[index]);
      return Number.isNaN(value) ? null : value;
    }
    
    if (type === 'boolean') {
      const value = effectiveArgs[index]?.toLowerCase();
      if (value === 'true' || value === 'yes' || value === '1') return true;
      if (value === 'false' || value === 'no' || value === '0') return false;
      return null;
    }
    
    return effectiveArgs[index] || null;
  };
  
  const mockInteraction = {
    type: 2,
    commandName: actualCommandName,
    customId: actualCommandName,
    member,
    guild,
    channel,
    user: author,
    client,
    options: {
      getSubcommand: () => {
        return subcommand ? subcommand.name : null;
      },
      getString: (name, required = false) => {
        const value = getArgByOption(name, 'string');
        return value !== null ? value : (required ? '' : null);
      },
      getInteger: (name, required = false) => {
        const value = getArgByOption(name, 'integer');
        return value !== null ? value : (required ? 0 : null);
      },
      getBoolean: (name, required = false) => {
        const value = getArgByOption(name, 'boolean');
        return value !== null ? value : (required ? false : null);
      },
      getUser: (name) => {
        const mention = getArgByOption(name, 'string');
        if (!mention) return null;
        const userId = mention.replace(/[<@!>]/g, '');
        return guild.members.cache.get(userId)?.user || null;
      },
      getChannel: (name) => {
        const mention = getArgByOption(name, 'string');
        if (!mention) return null;
        const channelId = mention.replace(/[<#>]/g, '');
        return guild.channels.cache.get(channelId) || null;
      },
      getRole: (name) => {
        const mention = getArgByOption(name, 'string');
        if (!mention) return null;
        const roleId = mention.replace(/[<@&>]/g, '');
        return guild.roles.cache.get(roleId) || null;
      },
      getAttachment: (name) => {
        return message.attachments.first() || null;
      },
      data: []
    },
    reply: async (payload) => {
      const formatted = formatBotMessage(payload);
      const reply = await message.reply(formatted);
      
      const settings = getGuildSettings(guild.id);
      scheduleAutoDelete(reply, settings);
      
      return reply;
    },
    editReply: async (payload) => {
      const formatted = formatBotMessage(payload);
      const sent = await message.channel.messages.fetch({ limit: 1 });
      const lastMessage = sent.first();
      if (lastMessage && lastMessage.author.id === client.user.id) {
        return await lastMessage.edit(formatted);
      }
      const reply = await message.reply(formatted);
      const settings = getGuildSettings(guild.id);
      scheduleAutoDelete(reply, settings);
      return reply;
    },
    deferReply: async () => {
      await message.channel.sendTyping();
    },
    followUp: async (payload) => {
      const formatted = formatBotMessage(payload);
      const followUpMsg = await message.channel.send(formatted);
      
      const settings = getGuildSettings(guild.id);
      scheduleAutoDelete(followUpMsg, settings);
      
      return followUpMsg;
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

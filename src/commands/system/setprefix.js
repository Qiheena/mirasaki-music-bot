const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  getGuildSettings, saveDb, db
} = require('../../modules/db');
const { colorResolver } = require('../../util');

module.exports = new ChatInputCommand({
  global: true,
  permLevel: 'Administrator',
  aliases: ['prefix', 'changeprefix'],
  data: {
    description: 'Configure the prefix for text commands',
    options: [
      {
        name: 'view',
        description: 'View the current prefix',
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: 'set',
        description: 'Set a new prefix for text commands',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'prefix',
            description: 'The new prefix to use (e.g., !, ?, .)',
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      }
    ]
  },
  run: async (client, interaction) => {
    const {
      member, guild, options
    } = interaction;
    const { emojis } = client.container;
    const action = options.getSubcommand();
    const settings = getGuildSettings(guild.id);
    const guilds = db.getCollection('guilds');

    switch (action) {
      case 'set': {
        const newPrefix = options.getString('prefix');
        
        if (newPrefix.length > 5) {
          interaction.reply(`${ emojis.error } ${ member }, prefix must be 5 characters or less - this command has been cancelled`);
          return;
        }

        if (newPrefix.includes(' ')) {
          interaction.reply(`${ emojis.error } ${ member }, prefix cannot contain spaces - this command has been cancelled`);
          return;
        }

        settings.prefix = newPrefix;
        guilds.update(settings);
        saveDb();

        interaction.reply(`${ emojis.success } ${ member }, prefix has been updated to \`${ newPrefix }\``);
        break;
      }

      case 'view':
      default: {
        const currentPrefix = settings.prefix || '!';
        
        interaction.reply({
          embeds: [
            {
              color: colorResolver(),
              author: {
                name: `Prefix configuration for ${ guild.name }`,
                icon_url: guild.iconURL({ dynamic: true })
              },
              description: `Current prefix: \`${ currentPrefix }\`\n\nNote: The bot owner can use commands without any prefix.`,
              footer: { text: 'Use /setprefix set <prefix> to change the prefix' }
            }
          ]
        });
        break;
      }
    }
  }
});

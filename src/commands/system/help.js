const { ChatInputCommand } = require('../../classes/Commands');
const { EmbedBuilder } = require('discord.js');
const { commandAutoCompleteOption } = require('../../interactions/autocomplete/command');
const { colorResolver } = require('../../util');
const { getGuildSettings } = require('../../modules/db');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['h', 'commands', 'cmd'],
  cooldown: {
    type: 'user',
    usages: 2,
    duration: 10
  },
  clientPerms: ['EmbedLinks'],
  data: {
    description: 'Get help and see all available bot commands',
    options: [commandAutoCompleteOption]
  },

  run: async (client, interaction) => {
    const { guild } = interaction;
    const { commands, emojis } = client.container;

    // Fetch guild-specific settings, defaulting to '!' prefix
    const settings = getGuildSettings(guild.id);
    const prefix = settings?.prefix || '!';

    const commandName = interaction.options.getString('command');

    // Display detailed help for a SPECIFIC command
    if (commandName) {
      const cmd = commands.get(commandName.toLowerCase()) || commands.find(c => c.aliases?.includes(commandName.toLowerCase()));
      if (!cmd) {
        const reply = await interaction.reply({
          content: `${emojis.error} The command **"${commandName}"** was not found.`,
          ephemeral: true,
          fetchReply: true
        });
        return; // No need to auto-delete an ephemeral message
      }

      // Format aliases for display
      const aliases = cmd.aliases?.length
        ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ')
        : 'None';

      const embed = new EmbedBuilder()
        .setColor(colorResolver())
        .setTitle(`📖 Command Help: /${cmd.data.name}`)
        .setDescription(cmd.data.description || 'No description available for this command.')
        .addFields(
          { name: '📁 Category', value: cmd.category || 'Miscellaneous', inline: true },
          { name: 'Cooldown', value: cmd.cooldown ? `${cmd.cooldown.duration}s` : 'None', inline: true },
          { name: '🔗 Aliases / Shortcuts', value: aliases, inline: false },
          { name: '📝 Usage', value: `To use this command, type: \`/${cmd.data.name}\``, inline: false }
        )
        .setFooter({ text: `Made With ❤️ @Rasavedic • This message will be deleted in 40 seconds.` })
        .setTimestamp();

      const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

      // Auto-delete the message after 40 seconds
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (error) {
          console.log(`Couldn't delete help message (specific command): ${error.message}`);
        }
      }, 40000);
      return;
    }

    // Display the main help embed with ALL commands
    else {
      // Group commands by category dynamically
      const categorizedCommands = new Map();
      commands.forEach(cmd => {
        // Hide owner-only commands from the public help menu
        if (cmd.ownerOnly) return;

        const category = cmd.category || 'Miscellaneous';
        if (!categorizedCommands.has(category)) {
          categorizedCommands.set(category, []);
        }

        // Format the command name and its aliases
        let commandInfo = `\`${prefix}${cmd.data.name}\``;
        if (cmd.aliases?.length) {
          commandInfo += ` - \`${prefix}${cmd.aliases.join(`\`, \`${prefix}`)}\``;
        }

        categorizedCommands.get(category).push(commandInfo);
      });

      const embed = new EmbedBuilder()
        .setColor(colorResolver())
        .setTitle(`${client.user.username} Command Menu`)
        .setDescription(
          `Hello! Here is a list of all my available commands.\n` +
          `Your server's prefix is \`${prefix}\`. You can also use slash commands (e.g., \`/play\`).\n` +
          `For more details on a specific command, use \`/help <command_name>\`.`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `Made With ❤️ @Rasavedic • This message will be deleted in 40 seconds.` })
        .setTimestamp();

      // Add a field for each category
      categorizedCommands.forEach((commandList, category) => {
        embed.addFields({
          name: `— ${category} —`,
          value: commandList.join('\n'),
          inline: false
        });
      });

      const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

      // Auto-delete the message after 40 seconds
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (error) {
          console.log(`Couldn't delete help message (main): ${error.message}`);
        }
      }, 40000);
    }
  }
});
const { ChatInputCommand } = require('../../classes/Commands');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  getCommandSelectMenu,
  generateCommandOverviewEmbed,
  generateCommandInfoEmbed
} = require('../../handlers/commands');
const { commandAutoCompleteOption } = require('../../interactions/autocomplete/command');

const helpPages = new Map();

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['h', 'commands', 'cmd'],
  cooldown: {
    type: 'user',
    usages: 2,
    duration: 10
  },
  clientPerms: [ 'EmbedLinks' ],
  data: {
    description: 'Get help and see all available bot commands with their usage',
    options: [ commandAutoCompleteOption ]
  },

  run: async (client, interaction) => {
    const { member } = interaction;
    const {
      commands, contextMenus, emojis
    } = client.container;

    const commandName = interaction.options.getString('command');
    const hasCommandArg = commandName !== null && typeof commandName !== 'undefined';

    if (!hasCommandArg) {
      const cmdSelectMenu = getCommandSelectMenu(member);
      const embed = generateCommandOverviewEmbed(commands, interaction);
      
      // Create navigation buttons
      const navButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_previous')
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('help_home')
            .setLabel('🏠 Home')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_next')
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
        );

      const response = await interaction.reply({
        embeds: [ embed ],
        components: [ cmdSelectMenu, navButtons ],
        fetchReply: true
      });

      // Store page info for navigation
      helpPages.set(response.id, {
        page: 0,
        totalPages: Math.ceil(commands.size / 10),
        userId: member.id
      });

      // Clean up old entries (older than 5 minutes)
      setTimeout(() => {
        helpPages.delete(response.id);
      }, 5 * 60 * 1000);

      return;
    }

    const clientCmd = commands.get(commandName) || contextMenus.get(commandName);

    if (!clientCmd) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, I couldn't find the command **\`/${commandName}\`**`);
      interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true
      });
      return;
    }

    interaction.reply({ 
      embeds: [generateCommandInfoEmbed(clientCmd, interaction)] 
    });
  }
});

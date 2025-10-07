const { ComponentCommand } = require('../../classes/Commands');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateCommandOverviewEmbed, getCommandSelectMenu } = require('../../handlers/commands');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    await interaction.deferUpdate();
    await interaction.editReply({ content: '⬅️ Previous page feature coming soon!', components: [] });
  }
});

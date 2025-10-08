const { Button } = require('../../classes/Commands');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildSettings } = require('../../modules/db');
const { colorResolver } = require('../../util');

// Re-usable helper functions
const getCategorizedCommands = (client) => {
  const categories = new Map();
  client.container.commands.forEach(cmd => {
    if (cmd.ownerOnly) return;
    const category = cmd.category || 'Miscellaneous';
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(cmd);
  });
  return Array.from(categories.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, commands]) => ({ name, commands }));
};
const generateEmbed = (page, categorizedData, client, prefix) => {
  const totalPages = categorizedData.length + 1;
  const embed = new EmbedBuilder().setColor(colorResolver()).setTimestamp().setFooter({ text: `Page ${page + 1}/${totalPages} • Made With ❤️ @Rasavedic` });
  if (page === 0) {
    embed.setTitle(`🎵 ${client.user.username} Help Menu`).setThumbnail(client.user.displayAvatarURL()).setDescription(`Welcome! Here are all my command categories.\nYour server prefix is \`${prefix}\`.\n\nUse the buttons below to navigate.`);
    categorizedData.forEach(cat => embed.addFields({ name: `— ${cat.name}`, value: `> ${cat.commands.length} commands`, inline: true }));
  } else {
    const category = categorizedData[page - 1];
    embed.setTitle(`— ${category.name} Commands —`).setDescription(`Here are all the commands in the **${category.name}** category.`);
    category.commands.forEach(cmd => {
      const aliases = cmd.aliases?.length ? `\n*Aliases: \`${cmd.aliases.join('`, `')}\`*` : '';
      embed.addFields({ name: `${prefix}${cmd.data.name}`, value: `> ${cmd.data.description || 'No description available.'}${aliases}` });
    });
  }
  return embed;
};

module.exports = new Button({
  data: { customId: 'help_next' },
  run: async (client, interaction) => {
    // Cancel the auto-delete timer
    if (client.container.helpCommandTimers?.has(interaction.message.id)) {
      clearTimeout(client.container.helpCommandTimers.get(interaction.message.id));
      client.container.helpCommandTimers.delete(interaction.message.id);
    }
    
    const { guild } = interaction;
    const settings = getGuildSettings(guild.id);
    const prefix = settings?.prefix || '!';

    const categorizedData = getCategorizedCommands(client);
    const totalPages = categorizedData.length + 1;

    // Get current page from footer
    const footerText = interaction.message.embeds[0].footer.text;
    const currentPage = parseInt(footerText.match(/Page (\d+)/)[1], 10) - 1;
    let newPage = currentPage + 1;

    const embed = generateEmbed(newPage, categorizedData, client, prefix);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_previous').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(false), // Always enabled when going forward
      new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Primary).setDisabled(false),
      new ButtonBuilder().setCustomId('help_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(newPage === totalPages - 1)
    );
    
    await interaction.update({ embeds: [embed], components: [row] });
  }
});
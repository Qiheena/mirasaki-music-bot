const { ChatInputCommand } = require('../../classes/Commands');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildSettings } = require('../../modules/db');
const { colorResolver } = require('../../util');

// Helper function to get and categorize commands
const getCategorizedCommands = (client) => {
  const categories = new Map();
  client.container.commands.forEach(cmd => {
    if (cmd.ownerOnly) return; // Hide owner-only commands
    const category = cmd.category || 'Miscellaneous';
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(cmd);
  });
  // Return a sorted array for consistent order
  return Array.from(categories.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, commands]) => ({ name, commands }));
};

// Helper function to generate the embed for a specific page
const generateEmbed = (page, categorizedData, client, prefix) => {
  const totalPages = categorizedData.length + 1; // +1 for the home page
  const embed = new EmbedBuilder()
    .setColor(colorResolver())
    .setTimestamp()
    .setFooter({ text: `Page ${page + 1}/${totalPages} • Made With ❤️ @Rasavedic` });

  if (page === 0) {
    // Home Page
    embed
      .setTitle(`🎵 ${client.user.username} Help Menu`)
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        `Welcome! Here are all my command categories.\n` +
        `Your server prefix is \`${prefix}\`. You can also use Slash Commands (e.g., \`/play\`).\n\n` +
        `Use the buttons below to navigate through the categories.`
      );
    categorizedData.forEach(cat => {
      embed.addFields({ name: `— ${cat.name}`, value: `> ${cat.commands.length} commands`, inline: true });
    });
  } else {
    // Category Page
    const category = categorizedData[page - 1];
    embed
      .setTitle(`— ${category.name} Commands —`)
      .setDescription(`Here are all the commands in the **${category.name}** category.`);
    
    category.commands.forEach(cmd => {
      const aliases = cmd.aliases?.length ? `\n*Aliases: \`${cmd.aliases.join('`, `')}\`*` : '';
      embed.addFields({
        name: `${prefix}${cmd.data.name}`,
        value: `> ${cmd.data.description || 'No description available.'}${aliases}`
      });
    });
  }
  return embed;
};

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['h', 'commands', 'cmd'],
  cooldown: { type: 'user', usages: 2, duration: 10 },
  clientPerms: ['EmbedLinks'],
  data: { description: 'Get help and see all available bot commands' },

  run: async (client, interaction) => {
    const { guild } = interaction;
    const settings = getGuildSettings(guild.id);
    const prefix = settings?.prefix || '!';

    const categorizedData = getCategorizedCommands(client);
    const totalPages = categorizedData.length + 1;

    // Create the initial embed (home page)
    const embed = generateEmbed(0, categorizedData, client, prefix);

    // Create buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('help_home')
        .setLabel('Home')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1)
    );

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // Smart auto-deletion logic
    if (!client.container.helpCommandTimers) {
      client.container.helpCommandTimers = new Map();
    }
    const timeout = setTimeout(async () => {
      try {
        await reply.edit({ components: [] }); // Disable buttons
      } catch (error) {
        // Ignore if message was already deleted
        if (error.code !== 10008) console.error("Failed to disable help buttons:", error);
      }
      client.container.helpCommandTimers.delete(reply.id);
    }, 30000); // 30 seconds

    client.container.helpCommandTimers.set(reply.id, timeout);
  }
});
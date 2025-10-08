const { ChatInputCommand } = require('../../classes/Commands');
// ComponentType is required for the collector
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js'); 
const { getGuildSettings } = require('../../modules/db');
const { colorResolver } = require('../../util');

// Helper function to get and categorize commands
const getCategorizedCommands = (client) => {
  const categories = new Map();
  client.container.commands.forEach(cmd => {
    // Check if command is loadable and not owner-only
    if (!cmd.data?.name || cmd.ownerOnly) return; 

    // Category check
    const category = cmd.category || 'System'; 
    
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(cmd);
  });
  
  // Return a sorted array for consistent order
  return Array.from(categories.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, commands]) => ({ name, commands }));
};

// Helper function to generate the embed for a specific page
const generateEmbed = (page, categorizedData, client, prefix, totalPages) => {
  const embed = new EmbedBuilder()
    .setColor(colorResolver())
    .setTimestamp()
    // Footer mein dynamic totalPages ka upyog
    .setFooter({ text: `Page ${page + 1}/${totalPages} • Made With ❤️ @Rasavedic` });

  if (page === 0) {
    // Home Page
    embed
      .setTitle(`🎵 ${client.user.username} Help Menu`)
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        `Swagat hai! Yeh mere sabhi command categories hain.\n` +
        `Aapke server ka prefix hai \`${prefix}\`. Aap Slash Commands bhi use kar sakte hain (jaise, \`/play\`).\n\n` +
        `Categories ke beech navigate karne ke liye niche diye gaye buttons ka upyog karein.`
      );
    // Dynamically show category list on the home page
    categorizedData.forEach(cat => {
      embed.addFields({ name: `— ${cat.name}`, value: `> ${cat.commands.length} commands`, inline: true });
    });
  } else {
    // Category Page (Page 1 is the first category)
    const category = categorizedData[page - 1]; // Page 0 is Home
    embed
      .setTitle(`— ${category.name} Commands —`)
      .setDescription(`**${category.name}** category mein available sabhi commands yahaan hain.`);

    category.commands.forEach(cmd => {
      // Command name, aliases, aur description modules se nikalna
      const aliases = cmd.aliases?.length ? `\n*Aliases: \`${cmd.aliases.join('`, `')}\`*` : '';
      embed.addFields({
        name: `\`${prefix}${cmd.data.name}\``,
        value: `> ${cmd.data.description || 'Description available nahi hai.'}${aliases}`,
        inline: false 
      });
    });
  }
  return embed;
};

/**
 * Pagination buttons ke liye ActionRow banata hai.
 * @param {number} currentPage - Current page index (0-based).
 * @param {number} totalPages - Total pages.
 * @param {boolean} disabled - Agar buttons disable karne hain.
 * @returns {ActionRowBuilder} Buttons ke saath row.
 */
const createActionRow = (currentPage, totalPages, disabled = false) => {
    const isHome = currentPage === 0;
    const isLastPage = currentPage === totalPages - 1;
    
    // Sabhi buttons ke Custom ID interactions files se match karne chahiye
    const prevButton = new ButtonBuilder()
        .setCustomId('help_previous')
        .setLabel('◀️ Piche')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isHome); 

    const homeButton = new ButtonBuilder()
        .setCustomId('help_home')
        .setLabel('🏠 Home')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || isHome); 

    const nextButton = new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Aage ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isLastPage); 

    return new ActionRowBuilder().addComponents(prevButton, homeButton, nextButton);
};


module.exports = new ChatInputCommand({
  global: true,
  aliases: ['h', 'commands', 'cmd'],
  // Cooldown badha diya hai taaki collector ke saath theek se kaam kare
  cooldown: { type: 'user', usages: 2, duration: 180 }, 
  clientPerms: ['EmbedLinks'],
  data: { description: 'Help dekho aur sabhi available bot commands dekho' },

  run: async (client, interaction) => {
    const { guild } = interaction;
    const settings = getGuildSettings(guild.id);
    const prefix = settings?.prefix || '!';

    const categorizedData = getCategorizedCommands(client);
    // totalPages = 1 (Home Page) + categories ki sankhya
    const totalPages = categorizedData.length + 1;
    
    if (totalPages <= 1) {
        // Agar sirf Home page hai (koi category/command nahi)
        const embed = generateEmbed(0, categorizedData, client, prefix, totalPages);
        return interaction.reply({ 
            embeds: [embed],
            components: [], 
            ephemeral: false 
        });
    }

    let currentPage = 0; // Home page se shuru (0)

    // Initial embed aur action row banao
    const embed = generateEmbed(currentPage, categorizedData, client, prefix, totalPages);
    const row = createActionRow(currentPage, totalPages);

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true, 
      ephemeral: false 
    });

    // --- Interaction Collector Implementation (The Fix for Persistence) ---
    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000, // 3 minutes tak buttons chalenge
        filter: i => i.user.id === interaction.user.id // Sirf command chalaane wala user hi use kar sakta hai
    });

    collector.on('collect', async i => {
        let newPage = currentPage;
        
        switch (i.customId) {
            case 'help_next':
                // Next page, last page par ruk jao
                newPage = Math.min(currentPage + 1, totalPages - 1);
                break;
            case 'help_previous':
                // Previous page, first page (Home) par ruk jao
                newPage = Math.max(currentPage - 1, 0);
                break;
            case 'help_home':
                // Home page (Page 0)
                newPage = 0;
                break;
            default:
                return;
        }

        // Agar page change nahi hua, toh sirf update acknowledge karo
        if (newPage === currentPage) {
            await i.deferUpdate(); 
            return;
        }

        // State update
        currentPage = newPage;
        
        // Naye page ke liye embed aur buttons banao
        const updatedEmbed = generateEmbed(currentPage, categorizedData, client, prefix, totalPages);
        const updatedRow = createActionRow(currentPage, totalPages);
        
        // i.update() se message edit karo, isse buttons visible rehte hain
        await i.update({
            embeds: [updatedEmbed],
            components: [updatedRow],
        });
    });

    collector.on('end', () => {
        // --- Button Timeout/Deletion Fix ---
        // Jab collector ka time khatam ho jaaye (3 minutes), toh buttons disable kar do
        const disabledRow = createActionRow(currentPage, totalPages, true); // true = disable all

        // Original message ko edit karke buttons disable kar do
        reply.edit({
            components: [disabledRow]
        }).catch(error => {
            // Agar message pehle hi delete ho chuka hai, toh error ko ignore kar do (10008: Unknown Message)
            if (error.code !== 10008) console.error("Timeout ke baad help buttons disable karne mein fail:", error);
        });
    });
  }
});

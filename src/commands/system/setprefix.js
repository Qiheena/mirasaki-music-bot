const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  getGuildSettings, saveDb, db
} = require('../../modules/db');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['prefix', 'changeprefix'],
  data: {
    description: 'Configure the prefix for text commands',
    options: [
      {
        name: 'prefix',
        description: 'The new prefix to use (e.g., !, ?, .)',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  run: async (client, interaction) => {
    const {
      member, guild, options
    } = interaction;
    const { emojis } = client.container;
    const newPrefix = options.getString('prefix');
    
    // Validation
    if (newPrefix.length > 5) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, prefix must be 5 characters or less - this command has been cancelled`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (newPrefix.includes(' ')) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, prefix cannot contain spaces - this command has been cancelled`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Create buttons for user/guild choice
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`prefix_user_${member.id}_${newPrefix}`)
          .setLabel('Personal Prefix')
          .setEmoji('👤')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`prefix_guild_${member.id}_${newPrefix}`)
          .setLabel('Server Prefix')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Success)
      );

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('🔧 Prefix Configuration')
      .setDescription([
        `You want to set the prefix to: **\`${newPrefix}\`**`,
        '',
        '**Choose where to apply this prefix:**',
        '',
        '👤 **Personal Prefix** - Only for you (works everywhere)',
        '🌐 **Server Prefix** - For everyone in this server (requires Moderator/Admin)',
        '',
        '**Current Server Prefix:** `' + (await getGuildSettings(guild.id)).prefix + '`'
      ].join('\n'))
      .setFooter({ text: 'Click a button to confirm your choice' });

    await interaction.reply({ 
      embeds: [embed], 
      components: [row],
      ephemeral: true 
    });
  }
});

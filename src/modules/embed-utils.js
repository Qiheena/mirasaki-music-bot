const { EmbedBuilder } = require('discord.js');

const COLORS = {
  SUCCESS: 0x00FF00,  // Green
  ERROR: 0xFF0000,    // Red
  INFO: 0xFF69B4,     // Pink (brand color)
  WARNING: 0xFFA500   // Orange
};

/**
 * Create a success embed (green color)
 * @param {string} message - The message to display
 * @param {string} [title] - Optional title
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(message, title = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(message || 'No message provided');
  
  if (title) embed.setTitle(title);
  return embed;
}

/**
 * Create an error embed (red color)
 * @param {string} message - The error message to display
 * @param {string} [title] - Optional title
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(message, title = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setDescription(message || 'An error occurred');
  
  if (title) embed.setTitle(title);
  return embed;
}

/**
 * Create an info embed (pink color)
 * @param {string} message - The info message to display
 * @param {string} [title] - Optional title
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(message, title = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setDescription(message || 'No information available');
  
  if (title) embed.setTitle(title);
  return embed;
}

/**
 * Create a warning embed (orange color)
 * @param {string} message - The warning message to display
 * @param {string} [title] - Optional title
 * @returns {EmbedBuilder}
 */
function createWarningEmbed(message, title = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setDescription(message || 'Warning');
  
  if (title) embed.setTitle(title);
  return embed;
}

module.exports = {
  COLORS,
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createWarningEmbed
};

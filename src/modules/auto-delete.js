// Auto-delete helper for bot messages
const logger = require('@mirasaki/logger');

// Default delete time in milliseconds
const DEFAULT_DELETE_TIME = 15000; // 15 seconds

async function autoDeleteMessage(message, deleteAfterMs = DEFAULT_DELETE_TIME) {
  if (!message || !message.deletable) return;
  
  try {
    setTimeout(async () => {
      try {
        await message.delete();
      } catch (e) {
        logger.debug(`Could not auto-delete message: ${e.message}`);
      }
    }, deleteAfterMs);
  } catch (e) {
    logger.debug(`Error setting up auto-delete: ${e.message}`);
  }
}

async function autoDeleteReply(interaction, deleteAfterMs = DEFAULT_DELETE_TIME) {
  if (!interaction || !interaction.replied) return;
  
  try {
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (e) {
        logger.debug(`Could not auto-delete interaction reply: ${e.message}`);
      }
    }, deleteAfterMs);
  } catch (e) {
    logger.debug(`Error setting up auto-delete for reply: ${e.message}`);
  }
}

module.exports = {
  autoDeleteMessage,
  autoDeleteReply,
  DEFAULT_DELETE_TIME
};

const { ComponentCommand } = require('../../classes/Commands');
const { getGuildSettings, saveDb, db } = require('../../modules/db');
const { createSuccessEmbed, createErrorEmbed } = require('../../modules/embed-utils');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, customId } = interaction;

    // Parse customId: prefix_user_{userId}_{newPrefix}
    const parts = customId.split('_');
    const userId = parts[2];
    const newPrefix = parts.slice(3).join('_');

    // Check if the button was clicked by the right user
    if (member.id !== userId) {
      const errorEmbed = createErrorEmbed(`${emojis.error} This button is not for you!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
      // Store user prefix in database
      const users = db.getCollection('users') || db.addCollection('users', { unique: ['id'] });
      let userSettings = users.findOne({ id: member.id });
      
      if (!userSettings) {
        userSettings = {
          id: member.id,
          prefix: newPrefix
        };
        users.insert(userSettings);
      } else {
        userSettings.prefix = newPrefix;
        users.update(userSettings);
      }
      
      await saveDb();

      const successEmbed = createSuccessEmbed(`${emojis.success} ${member}, your personal prefix has been set to \`${newPrefix}\`\n\nYou can now use commands like: \`${newPrefix}play\`, \`${newPrefix}queue\`, etc.`);
      await interaction.update({ embeds: [successEmbed], components: [] });
    } catch (e) {
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, something went wrong:\n\n${e.message}`);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

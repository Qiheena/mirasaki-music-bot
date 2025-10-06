const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { getGuildSettings, saveDb, db } = require('../../modules/db');

module.exports = new ChatInputCommand({
  permLevel: 'Administrator',
  global: true,
  aliases: ['autodelete', 'setautodelete', 'ad'],
  data: {
    description: 'Set auto-delete duration for bot messages (in seconds, 0 to disable)',
    options: [
      {
        name: 'duration',
        description: 'Duration in seconds before bot messages are deleted (0 to disable)',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 0,
        max_value: 300
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;
    const duration = interaction.options.getInteger('duration');

    try {
      const guilds = db.getCollection('guilds');
      const settings = getGuildSettings(guild.id);
      
      settings.autoDeleteDuration = duration;
      guilds.update(settings);
      saveDb();

      if (duration === 0) {
        await interaction.reply(`${emojis.success} ${member}, auto-delete for bot messages has been **disabled**`);
      } else {
        await interaction.reply(`${emojis.success} ${member}, bot messages will now be automatically deleted after **${duration} seconds**`);
      }
    } catch (e) {
      await interaction.reply(`${emojis.error} ${member}, something went wrong:\n\n${e.message}`);
    }
  }
});

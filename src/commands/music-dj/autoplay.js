const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['ap', 'auto'],
  data: { description: 'Toggle autoplay - automatically queue related songs when queue is empty' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no active music session - this command has been cancelled` });
          return;
        }

        queue.autoplay = !queue.autoplay;
        await interaction.reply(`${ emojis.success } ${ member }, autoplay has been **${ queue.autoplay ? 'enabled' : 'disabled' }**`);
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no active music session - this command has been cancelled` });
          return;
        }

        queue.setRepeatMode(queue.repeatMode === 3 ? 0 : 3);
        const isEnabled = queue.repeatMode === 3;
        await interaction.reply(`${ emojis.success } ${ member }, autoplay has been **${ isEnabled ? 'enabled' : 'disabled' }**`);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

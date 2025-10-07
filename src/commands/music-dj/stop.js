const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['disconnect', 'leave', 'l', 'lv', 'dc'],
  data: { description: 'Stop the music player and leave the voice channel' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { guild, member } = interaction;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const { cleanupGuildPlayer } = require('../../lavalink-setup');
        const { removePlayerListeners } = require('../../modules/player-events');
        const { stopVoiceActivityMonitor } = require('../../modules/voice-activity');
        
        const queue = client.queues.get(guild.id);
        if (queue && queue.currentMessage) {
          try {
            await queue.currentMessage.delete().catch(() => {});
          } catch (e) {
          }
        }
        
        await cleanupGuildPlayer(client, guild.id);
        removePlayerListeners(guild.id);
        stopVoiceActivityMonitor(guild.id);
        
        await interaction.reply(`${ emojis.success } ${ member }, the queue has been cleared and the player was disconnected.`);
      } else {
        const queue = useQueue(guild.id);
        queue.delete();
        await interaction.reply(`${ emojis.success } ${ member }, the queue has been cleared and the player was disconnected.`);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

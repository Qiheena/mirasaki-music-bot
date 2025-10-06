const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { ApplicationCommandOptionType } = require('discord.js');

const sleepTimers = new Map();

module.exports = new ChatInputCommand({
  global: true,
  data: {
    description: 'Set a sleep timer to stop playback after specified duration',
    options: [
      {
        name: 'minutes',
        description: 'Duration in minutes until playback stops (0 to cancel)',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 0,
        max_value: 300
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild, options } = interaction;
    const minutes = options.getInteger('minutes');

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      // Cancel existing timer if any
      if (sleepTimers.has(guild.id)) {
        clearTimeout(sleepTimers.get(guild.id));
        sleepTimers.delete(guild.id);
      }

      // Cancel command - 0 minutes
      if (minutes === 0) {
        await interaction.reply(`${ emojis.success } ${ member }, sleep timer has been cancelled`);
        return;
      }

      // Set new timer
      const durationMs = minutes * 60 * 1000;
      const timer = setTimeout(async () => {
        try {
          if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
            const player = client.players.get(guild.id);
            const queue = client.queues.get(guild.id);
            
            if (player) {
              await player.stopTrack();
              client.lavalink.leaveVoiceChannel(guild.id);
            }
            if (queue) {
              queue.clear();
              client.queues.delete(guild.id);
            }
            client.players.delete(guild.id);
          } else {
            const queue = useQueue(guild.id);
            if (queue) queue.delete();
          }
          
          sleepTimers.delete(guild.id);
          
          // Send message to channel
          const channel = guild.channels.cache.get(interaction.channelId);
          if (channel) {
            channel.send(`${ emojis.success } Sleep timer expired - playback has been stopped`).catch(() => {});
          }
        } catch (err) {
          console.error('Error in sleep timer:', err);
        }
      }, durationMs);

      sleepTimers.set(guild.id, timer);
      
      await interaction.reply(`${ emojis.success } ${ member }, sleep timer set for **${ minutes }** minute${ minutes !== 1 ? 's' : '' }. Playback will stop automatically.`);
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

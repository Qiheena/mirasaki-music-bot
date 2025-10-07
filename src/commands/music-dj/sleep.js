const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { ApplicationCommandOptionType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../modules/embed-utils');

const sleepTimers = new Map();

module.exports = new ChatInputCommand({
  global: true,
  data: {
    description: 'Set a sleep timer to stop playback after specified duration',
    options: [
      {
        name: 'hours',
        description: 'Hours (h)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 0,
        max_value: 23
      },
      {
        name: 'minutes',
        description: 'Minutes (m)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 0,
        max_value: 59
      },
      {
        name: 'seconds',
        description: 'Seconds (s)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 0,
        max_value: 59
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild, options } = interaction;
    const hours = options.getInteger('hours') || 0;
    const minutes = options.getInteger('minutes') || 0;
    const seconds = options.getInteger('seconds') || 0;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      // Cancel existing timer if any
      if (sleepTimers.has(guild.id)) {
        clearTimeout(sleepTimers.get(guild.id));
        sleepTimers.delete(guild.id);
      }

      // Cancel command - all zeros
      if (hours === 0 && minutes === 0 && seconds === 0) {
        const successEmbed = createSuccessEmbed(`${emojis.success} ${member}, sleep timer has been cancelled`);
        await interaction.reply({ embeds: [successEmbed] });
        return;
      }

      // Calculate total duration
      const durationMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000);
      
      // Build time display string
      const timeParts = [];
      if (hours > 0) timeParts.push(`${hours}h`);
      if (minutes > 0) timeParts.push(`${minutes}m`);
      if (seconds > 0) timeParts.push(`${seconds}s`);
      const timeDisplay = timeParts.join(' ');

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
            const { removePlayerListeners } = require('../../modules/player-events');
            const { stopVoiceActivityMonitor } = require('../../modules/voice-activity');
            const { cleanupGuildPlayer } = require('../../lavalink-setup');
            
            removePlayerListeners(guild.id);
            stopVoiceActivityMonitor(guild.id);
            await cleanupGuildPlayer(client, guild.id);
          } else {
            const queue = useQueue(guild.id);
            if (queue) queue.delete();
          }
          
          sleepTimers.delete(guild.id);
          
          // Send message to channel
          const channel = guild.channels.cache.get(interaction.channelId);
          if (channel) {
            const { createSuccessEmbed } = require('../../modules/embed-utils');
            const successEmbed = createSuccessEmbed(`${emojis.success} Sleep timer expired - playback has been stopped`);
            channel.send({ embeds: [successEmbed] }).catch(() => {});
          }
        } catch (err) {
          console.error('Error in sleep timer:', err);
        }
      }, durationMs);

      sleepTimers.set(guild.id, timer);
      
      const successEmbed = createSuccessEmbed(`${emojis.success} ${member}, sleep timer set for **${timeDisplay}**. Playback will stop automatically.`);
      await interaction.reply({ embeds: [successEmbed] });
    }
    catch (e) {
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, something went wrong:\n\n${e.message}`);
      interaction.reply({ embeds: [errorEmbed] });
    }
  }
});

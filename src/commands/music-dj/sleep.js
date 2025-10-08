const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { ApplicationCommandOptionType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../modules/embed-utils');

const sleepTimers = new Map();

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['sl'],
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
    
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    // Check if first argument is a time string (e.g., "30m", "1h30m", "45s")
    const firstArg = options.getString('hours');
    
    if (firstArg && typeof firstArg === 'string' && /[hms]/.test(firstArg)) {
      // Parse time string format like "30m" or "1h30m45s"
      const timeString = firstArg.toLowerCase();
      
      const hourMatch = timeString.match(/(\d+)h/);
      const minuteMatch = timeString.match(/(\d+)m/);
      const secondMatch = timeString.match(/(\d+)s/);
      
      if (hourMatch) hours = parseInt(hourMatch[1]);
      if (minuteMatch) minutes = parseInt(minuteMatch[1]);
      if (secondMatch) seconds = parseInt(secondMatch[1]);
    } else {
      // Use separate options (slash command format)
      hours = options.getInteger('hours') || 0;
      minutes = options.getInteger('minutes') || 0;
      seconds = options.getInteger('seconds') || 0;
    }

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

const logger = require('@mirasaki/logger');
const { getGuildSettings } = require('./db');
const { cleanupGuildPlayer } = require('../lavalink-setup');

const voiceActivityTimers = new Map();

async function startVoiceActivityMonitor(client, guildId) {
  if (voiceActivityTimers.has(guildId)) {
    clearInterval(voiceActivityTimers.get(guildId));
  }

  const interval = setInterval(async () => {
    try {
      const queue = client.queues.get(guildId);
      const player = client.players.get(guildId);
      
      if (!queue || !player) {
        stopVoiceActivityMonitor(guildId);
        return;
      }

      const settings = await getGuildSettings(guildId);
      
      if (settings.leaveOnEmpty && queue.metadata.voiceChannel) {
        const voiceChannel = queue.metadata.voiceChannel;
        const members = voiceChannel.members.filter(m => !m.user.bot);
        
        if (members.size === 0) {
          const leaveDelay = (settings.leaveOnEmptyCooldown || 300) * 1000;
          
          if (!queue.emptyChannelTimer) {
            queue.emptyChannelTimer = Date.now();
          }
          
          const elapsed = Date.now() - queue.emptyChannelTimer;
          
          if (elapsed >= leaveDelay) {
            logger.info(`Leaving voice channel in guild ${guildId} - empty for ${elapsed/1000}s`);
            
            queue.metadata.channel?.send('👋 Leaving voice channel because no one is listening.');
            
            await cleanupGuildPlayer(client, guildId);
            stopVoiceActivityMonitor(guildId);
          }
        } else {
          delete queue.emptyChannelTimer;
        }
      }
      
      if (player && player.track) {
        const inactivityLimit = 3 * 60 * 60 * 1000;
        const timeSinceLastActivity = Date.now() - queue.lastActivity;
        
        if (timeSinceLastActivity > inactivityLimit) {
          logger.warn(`Player in guild ${guildId} inactive for ${timeSinceLastActivity/1000}s, refreshing connection`);
          
          try {
            const currentTrack = queue.current;
            if (currentTrack) {
              await player.stopTrack();
              await new Promise(resolve => setTimeout(resolve, 500));
              await player.playTrack({ track: { encoded: currentTrack.track } });
              await player.setGlobalVolume(queue.volume);
              
              queue.lastActivity = Date.now();
              logger.success(`Refreshed player connection for guild ${guildId}`);
            }
          } catch (error) {
            logger.syserr(`Error refreshing player in guild ${guildId}:`);
            logger.printErr(error);
          }
        }
      }
    } catch (error) {
      logger.syserr(`Error in voice activity monitor for guild ${guildId}:`);
      logger.printErr(error);
    }
  }, 30000);

  voiceActivityTimers.set(guildId, interval);
  logger.debug(`Started voice activity monitor for guild ${guildId}`);
}

function stopVoiceActivityMonitor(guildId) {
  const timer = voiceActivityTimers.get(guildId);
  if (timer) {
    clearInterval(timer);
    voiceActivityTimers.delete(guildId);
    logger.debug(`Stopped voice activity monitor for guild ${guildId}`);
  }
}

module.exports = {
  startVoiceActivityMonitor,
  stopVoiceActivityMonitor
};

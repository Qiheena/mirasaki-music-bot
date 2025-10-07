const { EmbedBuilder } = require('discord.js');
const logger = require('@mirasaki/logger');
const { msToTime } = require('../lavalink-setup');
const { createMusicControlButtons } = require('./music-buttons');

const activePlayerListeners = new Map();

async function playNextTrack(client, guildId, queue, player) {
  try {
    if (!queue || !player) {
      logger.warn(`playNextTrack called but queue or player is missing for guild ${guildId}`);
      return;
    }
    
    let nextTrack = queue.next();
    
    if (!nextTrack && queue.autoplay && queue.current) {
      try {
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
        if (node) {
          const searchQuery = `${queue.current.info.author} ${queue.current.info.title}`;
          const result = await node.rest.resolve(`ytsearch:${searchQuery}`);
          
          if (result && result.data && result.data.length > 1) {
            const recommendedTrack = result.data[1];
            nextTrack = {
              track: recommendedTrack.encoded,
              info: recommendedTrack.info,
              requester: queue.current.requester
            };
            queue.add(nextTrack);
            nextTrack = queue.next();
          }
        }
      } catch (e) {
        logger.syserr('Autoplay error:');
        logger.printErr(e);
      }
    }
    
    if (nextTrack) {
      const maxRetries = 3;
      let retries = 0;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          await player.playTrack({ track: { encoded: nextTrack.track } });
          await player.setGlobalVolume(queue.volume);
          success = true;
          
          const indiaTime = Math.floor((Date.now() + 19800000) / 1000);
          
          // Enhanced metadata
          const source = nextTrack.info.sourceName || 'Unknown';
          const isLive = nextTrack.info.isStream || false;
          
          const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(nextTrack.info.title)
            .setURL(nextTrack.info.uri)
            .setDescription([
              `**🎤 Artist:** ${nextTrack.info.author || 'Unknown'}`,
              `**⏱️ Duration:** ${isLive ? '🔴 LIVE' : msToTime(nextTrack.info.length)}`,
              `**📡 Source:** ${source.toUpperCase()}`,
              `**👤 Requested by:** <@${nextTrack.requester.id}>`,
              '',
              `<t:${indiaTime}:T> || ❤️ made by @rasavedic ❤️`
            ].join('\n'))
            .setThumbnail(nextTrack.info.artworkUrl);

          const buttons = createMusicControlButtons(
            guildId,
            true,
            false,
            queue.history.length > 0,
            queue.autoplay,
            queue.loop
          );

          if (queue.currentMessage) {
            try {
              await queue.currentMessage.delete().catch(() => {});
            } catch (e) {
              logger.debug(`Could not delete message: ${e.message}`);
            }
          }

          const nowPlayingMessage = await queue.metadata.channel?.send({
            embeds: [embed],
            components: buttons
          });

          if (nowPlayingMessage) {
            queue.currentMessage = nowPlayingMessage;
          }
        } catch (playError) {
          retries++;
          logger.syserr(`Error playing track in guild ${guildId} (attempt ${retries}/${maxRetries}):`);
          logger.printErr(playError);
          
          if (retries >= maxRetries) {
            queue.metadata.channel?.send(`❌ Failed to play track after ${maxRetries} attempts. Skipping to next...`);
            
            const freshQueue = client.queues.get(guildId);
            const freshPlayer = client.players.get(guildId);
            if (freshQueue && freshPlayer && freshQueue.tracks.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
              await playNextTrack(client, guildId, freshQueue, freshPlayer);
            }
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    } else {
      if (queue.disconnectTimeout) {
        clearTimeout(queue.disconnectTimeout);
      }
      
      const { getGuildSettings } = require('./db');
      const settings = await getGuildSettings(guildId);
      const leaveDelay = (settings.leaveOnEndCooldown || 60) * 1000;
      
      queue.disconnectTimeout = setTimeout(async () => {
        if (queue.tracks.length === 0 && !queue.current && !player.track) {
          if (queue.currentMessage) {
            try {
              await queue.currentMessage.delete().catch(() => {});
            } catch (e) {
              logger.debug(`Could not delete message: ${e.message}`);
            }
          }
          
          try {
            await client.lavalink.leaveVoiceChannel(guildId);
          } catch (e) {
            logger.debug(`Error leaving voice channel: ${e.message}`);
          }
          
          client.queues.delete(guildId);
          client.players.delete(guildId);
          removePlayerListeners(guildId);
          
          logger.debug(`Left voice channel in guild ${guildId} due to inactivity`);
        }
      }, leaveDelay);
    }
  } catch (error) {
    logger.syserr(`Error in playNextTrack for guild ${guildId}:`);
    logger.printErr(error);
  }
}

function setupPlayerEvents(client, guildId, player, queue, emojis) {
  const existing = activePlayerListeners.get(guildId);
  if (existing && existing.player === player) {
    logger.debug(`Player listeners already set up for guild ${guildId} on same player instance`);
    return;
  }

  if (existing && existing.player !== player) {
    logger.info(`Removing old player listeners for guild ${guildId} and setting up new ones`);
    existing.player.off('end', existing.handlers.end);
    existing.player.off('exception', existing.handlers.exception);
    existing.player.off('stuck', existing.handlers.stuck);
  }

  const endHandler = async (data) => {
    if (data.reason === 'replaced') return;
    
    logger.debug(`Track ended in guild ${guildId}, reason: ${data.reason}`);
    const currentQueue = client.queues.get(guildId);
    const currentPlayer = client.players.get(guildId);
    if (currentQueue && currentPlayer) {
      await playNextTrack(client, guildId, currentQueue, currentPlayer);
    }
  };

  const exceptionHandler = async (data) => {
    logger.syserr(`Player exception in guild ${guildId}:`);
    console.error(data);
    
    const currentQueue = client.queues.get(guildId);
    if (currentQueue) {
      currentQueue.metadata.channel?.send(`${emojis.error} An error occurred while playing: ${data.exception?.message || 'Unknown error'}. Trying next track...`);
      
      setTimeout(async () => {
        const freshQueue = client.queues.get(guildId);
        const freshPlayer = client.players.get(guildId);
        if (freshQueue && freshPlayer) {
          await playNextTrack(client, guildId, freshQueue, freshPlayer);
        }
      }, 1000);
    }
  };

  const stuckHandler = async (data) => {
    logger.warn(`Player stuck in guild ${guildId}, threshold: ${data.thresholdMs}ms, attempting recovery`);
    
    const currentQueue = client.queues.get(guildId);
    if (currentQueue) {
      currentQueue.metadata.channel?.send(`${emojis.error} Player appears to be stuck, attempting to recover...`);
      
      setTimeout(async () => {
        const freshQueue = client.queues.get(guildId);
        const freshPlayer = client.players.get(guildId);
        
        if (freshQueue && freshPlayer) {
          try {
            await freshPlayer.stopTrack();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const currentTrack = freshQueue.current;
            if (currentTrack) {
              await freshPlayer.playTrack({ track: { encoded: currentTrack.track } });
              await freshPlayer.setGlobalVolume(freshQueue.volume);
              logger.success(`Recovered stuck player in guild ${guildId}`);
            } else {
              await playNextTrack(client, guildId, freshQueue, freshPlayer);
            }
          } catch (error) {
            logger.syserr(`Failed to recover stuck player in guild ${guildId}:`);
            logger.printErr(error);
            await playNextTrack(client, guildId, freshQueue, freshPlayer);
          }
        }
      }, 1000);
    }
  };

  player.on('end', endHandler);
  player.on('exception', exceptionHandler);
  player.on('stuck', stuckHandler);

  activePlayerListeners.set(guildId, {
    player,
    handlers: {
      end: endHandler,
      exception: exceptionHandler,
      stuck: stuckHandler
    }
  });

  logger.debug(`Set up player event listeners for guild ${guildId}`);
}

function removePlayerListeners(guildId) {
  const entry = activePlayerListeners.get(guildId);
  if (entry) {
    try {
      entry.player.off('end', entry.handlers.end);
      entry.player.off('exception', entry.handlers.exception);
      entry.player.off('stuck', entry.handlers.stuck);
    } catch (e) {
      logger.debug(`Error removing listeners: ${e.message}`);
    }
    activePlayerListeners.delete(guildId);
    logger.debug(`Removed player listeners for guild ${guildId}`);
  }
}

module.exports = {
  setupPlayerEvents,
  removePlayerListeners,
  playNextTrack
};

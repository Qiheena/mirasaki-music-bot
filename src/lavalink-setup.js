const logger = require('@mirasaki/logger');
const { Shoukaku, Connectors } = require('shoukaku');

/**
 * Initialize and configure Shoukaku (Lavalink wrapper) for the Discord bot
 * @param {Client} client - The Discord.js client
 * @returns {Shoukaku} The configured Shoukaku instance
 */
function initializeLavalink(client) {
  const nodes = [
    {
      name: process.env.LAVALINK_NODE_ID || 'main-node',
      url: `${process.env.LAVALINK_HOST || 'lava-v4.ajieblogs.eu.org'}:${process.env.LAVALINK_PORT || '80'}`,
      auth: process.env.LAVALINK_PASSWORD || 'https://dsc.gg/ajidevserver',
      secure: process.env.LAVALINK_SECURE === 'true'
    }
  ];

  logger.info(`Initializing Shoukaku with node: ${nodes[0].name} at ${nodes[0].url}`);

  const shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    nodes,
    {
      resume: true,
      resumeTimeout: 60,
      resumeByLibrary: true,
      reconnectTries: 15,
      reconnectInterval: 5000,
      restTimeout: 30000,
      moveOnDisconnect: true,
      userAgent: 'Discord Music Bot (Shoukaku)',
      structures: {
        rest: undefined,
        player: undefined
      }
    }
  );

  shoukaku.on('ready', (name) => {
    logger.success(`Lavalink node ready: ${name}`);
  });

  shoukaku.on('error', (name, error) => {
    logger.syserr(`Lavalink node error on ${name}:`);
    console.error(error);
  });

  shoukaku.on('close', (name, code, reason) => {
    logger.warn(`Lavalink node disconnected: ${name} - Code: ${code}, Reason: ${reason || 'Unknown'}`);
  });

  shoukaku.on('reconnecting', (name, tries) => {
    logger.info(`Lavalink node reconnecting: ${name} (attempt ${tries})`);
  });

  shoukaku.on('disconnect', async (name, count) => {
    logger.warn(`Lavalink node disconnected: ${name} (${count} players affected)`);
    
    if (count > 0) {
      client.players.forEach(async (player, guildId) => {
        const queue = client.queues.get(guildId);
        if (queue && queue.current) {
          try {
            const availableNode = [...shoukaku.nodes.values()].find(n => n.state === 2);
            if (availableNode) {
              logger.info(`Attempting to restore playback for guild ${guildId}`);
              const newPlayer = await shoukaku.joinVoiceChannel({
                guildId: guildId,
                channelId: queue.metadata.voiceChannel.id,
                shardId: player.guildId ?? 0,
                deaf: true
              });
              
              client.players.set(guildId, newPlayer);
              
              if (queue.current) {
                await newPlayer.playTrack({ track: { encoded: queue.current.track } });
                await newPlayer.setGlobalVolume(queue.volume);
                logger.success(`Restored playback for guild ${guildId}`);
              }
            }
          } catch (error) {
            logger.syserr(`Failed to restore playback for guild ${guildId}:`);
            logger.printErr(error);
          }
        }
      });
    }
  });

  shoukaku.on('debug', (name, info) => {
    if (process.env.DEBUG_ENABLED === 'true') {
      logger.debug(`[${name}] ${info}`);
    }
  });

  client.queues = new Map();
  client.players = new Map();
  client.playerTimeouts = new Map();

  return shoukaku;
}

/**
 * Create a simple queue manager for a guild
 * @param {string} guildId - The guild ID
 * @param {Object} metadata - Queue metadata (channel, member, etc.)
 * @returns {Object} Queue object
 */
function createQueue(guildId, metadata) {
  return {
    guildId,
    tracks: [],
    current: null,
    history: [],
    volume: 50,
    loop: 'off',
    autoplay: false,
    metadata,
    isPaused: false,
    lastActivity: Date.now(),
    
    add(track) {
      this.tracks.push(track);
      this.lastActivity = Date.now();
    },
    
    addToHistory(track) {
      if (track) {
        this.history.push(track);
        if (this.history.length > 100) {
          this.history.shift();
        }
      }
    },
    
    getPreviousTrack() {
      return this.history[this.history.length - 1] || null;
    },
    
    next() {
      if (this.loop === 'track') {
        this.lastActivity = Date.now();
        return this.current;
      }
      
      if (this.current && this.loop !== 'track') {
        this.addToHistory(this.current);
      }
      
      if (this.loop === 'queue' && this.current) {
        this.tracks.push(this.current);
      }
      
      this.current = this.tracks.shift() || null;
      this.lastActivity = Date.now();
      return this.current;
    },
    
    playPrevious() {
      const prevTrack = this.history.pop();
      if (prevTrack) {
        if (this.current) {
          this.tracks.unshift(this.current);
        }
        this.current = prevTrack;
        this.lastActivity = Date.now();
        return prevTrack;
      }
      return null;
    },
    
    clear() {
      this.tracks = [];
      this.lastActivity = Date.now();
    },
    
    shuffle() {
      for (let i = this.tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
      }
      this.lastActivity = Date.now();
    },
    
    remove(index) {
      if (index >= 0 && index < this.tracks.length) {
        this.lastActivity = Date.now();
        return this.tracks.splice(index, 1)[0];
      }
      return null;
    },
    
    move(from, to) {
      if (from >= 0 && from < this.tracks.length && to >= 0 && to < this.tracks.length) {
        const track = this.tracks.splice(from, 1)[0];
        this.tracks.splice(to, 0, track);
        this.lastActivity = Date.now();
        return true;
      }
      return false;
    },
    
    swap(index1, index2) {
      if (index1 >= 0 && index1 < this.tracks.length && index2 >= 0 && index2 < this.tracks.length) {
        [this.tracks[index1], this.tracks[index2]] = [this.tracks[index2], this.tracks[index1]];
        this.lastActivity = Date.now();
        return true;
      }
      return false;
    }
  };
}

/**
 * Cleanup player and queue for a guild
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 */
async function cleanupGuildPlayer(client, guildId) {
  try {
    const player = client.players.get(guildId);
    if (player) {
      try {
        await player.connection.disconnect();
      } catch (e) {
        logger.debug(`Error disconnecting player for guild ${guildId}: ${e.message}`);
      }
      client.players.delete(guildId);
    }
    
    const queue = client.queues.get(guildId);
    if (queue && queue.currentMessage) {
      try {
        await queue.currentMessage.delete().catch(() => {});
      } catch (e) {
      }
    }
    
    client.queues.delete(guildId);
    
    const timeout = client.playerTimeouts?.get(guildId);
    if (timeout) {
      clearTimeout(timeout);
      client.playerTimeouts.delete(guildId);
    }
    
    logger.debug(`Cleaned up player and queue for guild ${guildId}`);
  } catch (error) {
    logger.syserr(`Error cleaning up guild ${guildId}:`);
    logger.printErr(error);
  }
}

/**
 * Convert milliseconds to human readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
function msToTime(ms) {
  if (!ms || ms === 0) return '0:00';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = { initializeLavalink, createQueue, cleanupGuildPlayer, msToTime };

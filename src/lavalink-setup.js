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
      resumeTimeout: 30,
      resumeByLibrary: true,
      reconnectTries: 10,
      reconnectInterval: 3000,
      restTimeout: 15000,
      moveOnDisconnect: false,
      userAgent: 'Discord Music Bot (Shoukaku)',
      structures: {
        rest: undefined,
        player: undefined
      }
    }
  );

  // Node event listeners
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

  shoukaku.on('disconnect', (name, count) => {
    logger.warn(`Lavalink node disconnected: ${name} (${count} players affected)`);
  });

  shoukaku.on('debug', (name, info) => {
    if (process.env.DEBUG_ENABLED === 'true') {
      logger.debug(`[${name}] ${info}`);
    }
  });

  // Store queues and players in Maps for each guild
  client.queues = new Map();
  client.players = new Map();

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
    loop: 'off', // 'off', 'track', 'queue'
    autoplay: false,
    metadata,
    
    add(track) {
      this.tracks.push(track);
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
      if (this.loop === 'track') return this.current;
      
      if (this.current && this.loop !== 'track') {
        this.addToHistory(this.current);
      }
      
      if (this.loop === 'queue' && this.current) {
        this.tracks.push(this.current);
      }
      
      this.current = this.tracks.shift() || null;
      return this.current;
    },
    
    playPrevious() {
      const prevTrack = this.history.pop();
      if (prevTrack) {
        if (this.current) {
          this.tracks.unshift(this.current);
        }
        this.current = prevTrack;
        return prevTrack;
      }
      return null;
    },
    
    clear() {
      this.tracks = [];
    },
    
    shuffle() {
      for (let i = this.tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
      }
    },
    
    remove(index) {
      if (index >= 0 && index < this.tracks.length) {
        return this.tracks.splice(index, 1)[0];
      }
      return null;
    },
    
    move(from, to) {
      if (from >= 0 && from < this.tracks.length && to >= 0 && to < this.tracks.length) {
        const track = this.tracks.splice(from, 1)[0];
        this.tracks.splice(to, 0, track);
        return true;
      }
      return false;
    },
    
    swap(index1, index2) {
      if (index1 >= 0 && index1 < this.tracks.length && index2 >= 0 && index2 < this.tracks.length) {
        [this.tracks[index1], this.tracks[index2]] = [this.tracks[index2], this.tracks[index1]];
        return true;
      }
      return false;
    }
  };
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

module.exports = { initializeLavalink, createQueue, msToTime };

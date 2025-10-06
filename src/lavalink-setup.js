const logger = require('@mirasaki/logger');
const { LavalinkManager } = require('lavalink-client');

/**
 * Initialize and configure Lavalink for the Discord bot
 * @param {Client} client - The Discord.js client
 * @returns {LavalinkManager} The configured Lavalink manager
 */
function initializeLavalink(client) {
  const lavalinkNodes = [
    {
      authorization: process.env.LAVALINK_PASSWORD || 'https://dsc.gg/ajidevserver',
      host: process.env.LAVALINK_HOST || 'lava-v4.ajieblogs.eu.org',
      port: parseInt(process.env.LAVALINK_PORT || '80'),
      id: process.env.LAVALINK_NODE_ID || 'main-node',
      secure: process.env.LAVALINK_SECURE === 'true' || false,
      retryAmount: 10,
      retryDelay: 3000,
      requestSignalTimeoutMS: 15000
    }
  ];

  logger.info(`Initializing Lavalink with ultra-fast node: ${lavalinkNodes[0].host}:${lavalinkNodes[0].port}`);

  const lavalink = new LavalinkManager({
    nodes: lavalinkNodes,
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const shardId = guild.shardId ?? 0;
        const shard = client.ws.shards.get(shardId);
        if (shard) {
          shard.send(payload);
        } else {
          client.ws.broadcast(payload);
        }
      }
    },
    client: {
      id: process.env.DISCORD_CLIENT_ID || client.user?.id,
      username: 'Music Bot'
    },
    autoSkip: true,
    playerOptions: {
      clientBasedPositionUpdateInterval: 100,
      defaultSearchPlatform: 'ytsearch',
      volumeDecrementer: 0.75,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false
      },
      onEmptyQueue: {
        destroyAfterMs: 60_000
      },
      useUnresolvedData: true
    },
    queueOptions: {
      maxPreviousTracks: 25
    },
    advancedOptions: {
      maxRetryAttempts: 10,
      retryAttemptsInterval: 3000,
      debugOptions: {
        noAudio: false,
        playerDestroy: {
          debugLog: false
        }
      }
    }
  });

  // Forward raw Discord events to Lavalink
  client.on('raw', (d) => lavalink.sendRawData(d));

  // Lavalink event listeners
  lavalink.on('nodeConnect', (node) => {
    logger.success(`Lavalink node connected: ${node.id} (${node.options.host}:${node.options.port})`);
  });

  lavalink.on('nodeDisconnect', (node, reason) => {
    logger.warn(`Lavalink node disconnected: ${node.id} - Reason: ${reason?.message || 'Unknown'}`);
  });

  lavalink.on('nodeError', (node, error) => {
    logger.syserr(`Lavalink node error on ${node.id}:`);
    console.error(error);
  });

  lavalink.on('nodeReconnect', (node) => {
    logger.info(`Lavalink node reconnecting: ${node.id}`);
  });

  lavalink.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) {
      channel.send({
        embeds: [{
          color: 0x00ff00,
          title: '🎵 Now Playing',
          description: `**[${track.info.title}](${track.info.uri})**`,
          thumbnail: { url: track.info.artworkUrl },
          footer: { 
            text: `Duration: ${msToTime(track.info.duration)} | Requested by: ${track.requester?.username || 'Unknown'}` 
          }
        }]
      }).catch(console.error);
    }
  });

  lavalink.on('trackEnd', (player, track, payload) => {
    if (process.env.DEBUG_ENABLED === 'true') {
      logger.debug(`Track ended: ${track.info.title} - Reason: ${payload.reason}`);
    }
  });

  lavalink.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) {
      channel.send({
        embeds: [{
          color: 0xffa500,
          title: '📭 Queue Empty',
          description: 'The queue has finished playing. Add more songs with `/play`!'
        }]
      }).catch(console.error);
    }
  });

  lavalink.on('playerCreate', (player) => {
    if (process.env.DEBUG_ENABLED === 'true') {
      logger.debug(`Player created for guild: ${player.guildId}`);
    }
  });

  lavalink.on('playerDestroy', (player) => {
    if (process.env.DEBUG_ENABLED === 'true') {
      logger.debug(`Player destroyed for guild: ${player.guildId}`);
    }
  });

  return lavalink;
}

/**
 * Convert milliseconds to human readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
function msToTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = { initializeLavalink };

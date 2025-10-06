const { useMainPlayer } = require('discord-player');
const { ComponentCommand } = require('../../classes/Commands');
const logger = require('@mirasaki/logger');

const searchCache = new Map();
const CACHE_DURATION = 20000; // Reduced from 30s to 20s for faster fresh results
const MAX_CACHE_SIZE = 150; // Increased from 100 to 150 for more cached queries
const SEARCH_TIMEOUT = 2000; // Reduced from 2.5s to 2s for faster responses

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, searchCache.size - MAX_CACHE_SIZE).forEach(([key]) => searchCache.delete(key));
  }
}

module.exports = new ComponentCommand({ run: async (client, interaction, query) => {
  const startTime = Date.now();
  
  if (!query) return [];
  
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    logger.debug(`<play> | Auto Complete | Cached result for "${query}" in ${Date.now() - startTime} ms`);
    return cached.results;
  }

  const player = useMainPlayer();
  let result;
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), SEARCH_TIMEOUT)
    );
    
    result = await Promise.race([
      player.search(query),
      timeoutPromise
    ]);
  } catch (error) {
    logger.debug(`<play> | Auto Complete | Timeout or error for "${query}": ${error.message}`);
    return cached ? cached.results : [];
  }

  const returnData = [];
  if (result.playlist) {
    returnData.push({
      name: 'Playlist | ' + result.playlist.title, value: query
    });
  }

  result.tracks
    .slice(0, 25)
    .forEach((track) => {
      let name = `${ track.title } | ${ track.author ?? 'Unknown' } (${ track.duration ?? 'n/a' })`;
      if (name.length > 100) name = `${ name.slice(0, 97) }...`;
      let url = track.url;
      if (url.length > 100) url = url.slice(0, 100);
      return returnData.push({
        name,
        value: url
      });
    });

  searchCache.set(cacheKey, { results: returnData, timestamp: Date.now() });
  
  // Clean cache asynchronously to not block the response
  process.nextTick(cleanCache);
  
  const duration = Date.now() - startTime;
  logger.debug(`<play> | Auto Complete | Queried "${query}" in ${duration} ms`);
  
  return returnData;
} });

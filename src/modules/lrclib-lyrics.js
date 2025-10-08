// LRCLIB API integration for lyrics
const logger = require('@mirasaki/logger');

const LRCLIB_API_BASE = 'https://lrclib.net/api';

async function searchLyrics(trackName, artistName, albumName = null, duration = null) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName
    });
    
    if (albumName) params.append('album_name', albumName);
    if (duration) params.append('duration', Math.floor(duration / 1000));

    const response = await fetch(`${LRCLIB_API_BASE}/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'RasaVedic-MusicBot/1.5.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      plainLyrics: data.plainLyrics || null,
      syncedLyrics: data.syncedLyrics || null,
      trackName: data.trackName,
      artistName: data.artistName,
      albumName: data.albumName,
      duration: data.duration,
      instrumental: data.instrumental || false
    };
  } catch (error) {
    logger.syserr('LRCLIB search error:');
    logger.printErr(error);
    return null;
  }
}

async function searchLyricsMultiple(trackName, artistName) {
  try {
    const params = new URLSearchParams({
      q: `${trackName} ${artistName}`
    });

    const response = await fetch(`${LRCLIB_API_BASE}/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'RasaVedic-MusicBot/1.5.0'
      }
    });

    if (!response.ok) return null;

    const results = await response.json();
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    logger.syserr('LRCLIB search error:');
    logger.printErr(error);
    return null;
  }
}

function parseSyncedLyrics(syncedLyrics) {
  if (!syncedLyrics) return [];
  
  const lines = syncedLyrics.split('\n').filter(line => line.trim());
  const parsed = [];
  
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const [, minutes, seconds, fractional, text] = match;
      const mins = parseInt(minutes);
      const secs = parseInt(seconds);
      
      // Handle both 2-digit (centiseconds) and 3-digit (milliseconds) fractional parts
      let milliseconds;
      if (fractional.length === 2) {
        // Centiseconds: multiply by 10 to get milliseconds
        milliseconds = parseInt(fractional) * 10;
      } else {
        // Already milliseconds: use directly
        milliseconds = parseInt(fractional);
      }
      
      const timeMs = (mins * 60 + secs) * 1000 + milliseconds;
      parsed.push({
        time: timeMs,
        text: text.trim()
      });
    }
  }
  
  return parsed.sort((a, b) => a.time - b.time);
}

module.exports = {
  searchLyrics,
  searchLyricsMultiple,
  parseSyncedLyrics
};

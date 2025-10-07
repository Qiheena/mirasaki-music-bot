const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { lyricsExtractor: lyricsExtractorSuper } = require('@discord-player/extractor');
const { useQueue } = require('discord-player');
const { colorResolver } = require('../../util');
const { EMBED_DESCRIPTION_MAX_LENGTH } = require('../../constants');
const { requireSessionConditions } = require('../../modules/music');

const lyricsExtractor = lyricsExtractorSuper();

/**
 * Cleans and optimizes the song title for lyrics searching.
 * @param {string} query - The original song title.
 * @param {string} [artist=''] - The song's artist.
 * @returns {string} A cleaned search query.
 */
function optimizeLyricsQuery(query, artist = '') {
  if (!query) return '';
  
  let cleaned = query;

  // 1. Remove anything after parentheses (), brackets [], or pipes |
  cleaned = cleaned.split(/\||\(|\[/)[0].trim();
  
  // 2. Remove common junk words
  const junkWords = [
    'official', 'music', 'video', 'audio', 'lyric', 'lyrics',
    'hd', '4k', 'hq', 'live', 'visualizer', 'explicit',
    'remastered', 'remix', 'version', 'edit', 'feat', 'ft', 'feat.', 'ft.'
  ];
  const junkRegex = new RegExp(`\\b(${junkWords.join('|')})\\b`, 'gi');
  cleaned = cleaned.replace(junkRegex, '');

  // 3. Remove any special characters that might interfere with the search
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');

  // 4. Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 5. If the artist's name is not already in the query, add it to the beginning
  if (artist && !cleaned.toLowerCase().includes(artist.toLowerCase())) {
      cleaned = `${artist} ${cleaned}`;
  }

  return cleaned;
}

/**
 * Creates and sends a lyrics embed.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 * @param {object} result - The result from the lyrics extractor.
 * @param {string} [footerText=null] - Text to add to the embed's footer.
 */
async function sendLyricsEmbed(interaction, result, footerText = null) {
    const { title, fullTitle, thumbnail, image, url, artist, lyrics } = result;

    // If no lyrics are found, send a message
    if (!lyrics) {
        await interaction.editReply({
            content: `I found the song **\`${title}\`**, but it doesn't have any lyrics (it might be an instrumental).`
        });
        return;
    }

    // If the lyrics are too long, truncate them
    let description = lyrics;
    if (description.length > EMBED_DESCRIPTION_MAX_LENGTH) {
        description = description.slice(0, EMBED_DESCRIPTION_MAX_LENGTH - 4) + '...';
    }

    const lyricsEmbed = new EmbedBuilder()
        .setColor(colorResolver())
        .setTitle(title ?? 'Unknown Title')
        .setURL(url)
        .setAuthor({
            name: artist?.name ?? 'Unknown Artist',
            url: artist?.url ?? null,
            iconURL: artist?.image ?? null
        })
        .setDescription(description)
        .setThumbnail(thumbnail ?? image ?? null);
        
    if (fullTitle) lyricsEmbed.setFooter({ text: fullTitle });

    await interaction.editReply({ 
      content: footerText,
      embeds: [lyricsEmbed] 
    });
}


module.exports = new ChatInputCommand({
  global: true,
  aliases: ['ly', 'lyr'],
  cooldown: {
    usages: 5,
    duration: 30,
    type: 'guild'
  },
  data: {
    description: 'Display the lyrics for a specific song',
    options: [
      {
        name: 'query-lyrics',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The song you want to search for',
        required: false
      },
      {
        name: 'query-lyrics-no-auto-complete',
        type: ApplicationCommandOptionType.String,
        description: 'Search for a song without auto-complete',
        required: false
      }
    ]
  },

  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    let query = interaction.options.getString('query-lyrics') 
      ?? interaction.options.getString('query-lyrics-no-auto-complete');
    let artist = '';
    let trackTitle = '';
    const originalQuery = query;

    // If the user didn't provide a song, use the currently playing one
    if (!query) {
      if (process.env.USE_LAVALINK === 'true') {
        const queue = client.queues?.get(guild.id);
        if (queue?.current) {
          trackTitle = queue.current.info.title;
          artist = queue.current.info.author;
          query = `${artist} ${trackTitle}`;
        }
      } else {
        const queue = useQueue(guild.id);
        if (queue?.currentTrack) {
          trackTitle = queue.currentTrack.title;
          artist = queue.currentTrack.author;
          query = `${artist} ${trackTitle}`;
        }
      }
    }
    
    // If still no song is found, send an error
    if (!query) {
      interaction.reply({
        content: `${emojis.error} ${member}, please provide a song name, or play a song first.`,
        ephemeral: true
      });
      return;
    }

    // Check session conditions
    if (!requireSessionConditions(interaction, false, false, false)) return;

    await interaction.deferReply();
    
    // Optimize the song title for searching
    const optimizedQuery = optimizeLyricsQuery(trackTitle || query, artist);

    try {
      let res = await lyricsExtractor.search(optimizedQuery).catch(() => null);

      // If lyrics are not found on the first try
      if (!res || !res.lyrics) {
        console.log(`First search failed for "${optimizedQuery}", trying a second time...`);
        
        // Try again, this time with less optimization
        const fallbackQuery = trackTitle ? `${artist} ${trackTitle.split(/\||\(|\[/)[0].trim()}`.trim() : originalQuery;
        res = await lyricsExtractor.search(fallbackQuery).catch(() => null);
        
        // If the second attempt also fails
        if (!res || !res.lyrics) {
          interaction.editReply({
            content: `${emojis.error} ${member}, couldn't find lyrics for **\`${originalQuery || trackTitle}\`**.\n\nTried searching for: \`${optimizedQuery}\``
          });
          return;
        }
        
        // Success on the second try
        await sendLyricsEmbed(
          interaction,
          res,
          `${emojis.success} ${member}, I found lyrics with an alternative search.`
        );
        return;
      }

      // Success on the first try
      await sendLyricsEmbed(interaction, res);
      
    } catch (e) {
      console.error(e);
      interaction.editReply({
        content: `${emojis.error} ${member}, something went wrong while searching for lyrics:\n\n${e.message}`
      });
    }
  }
});
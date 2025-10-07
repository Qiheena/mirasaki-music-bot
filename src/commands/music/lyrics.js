// lyrics.js
const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { lyricsExtractor: lyricsExtractorSuper } = require('@discord-player/extractor');
const { useQueue } = require('discord-player');
const { colorResolver } = require('../../util');
const { EMBED_DESCRIPTION_MAX_LENGTH } = require('../../constants');
const { requireSessionConditions } = require('../../modules/music');

const lyricsExtractor = lyricsExtractorSuper();

// Helper function to clean and optimize search query
function optimizeLyricsQuery(query) {
  if (!query) return '';
  
  // Remove common separators and extra text
  let cleaned = query
    .replace(/\|\s*/g, ' ') // Remove pipe separators
    .replace(/\s+\|\s+/g, ' ')
    .replace(/lyrical\s*/gi, '') // Remove "lyrical" text
    .replace(/song\s*/gi, '') // Remove "song" text
    .replace(/official\s*/gi, '') // Remove "official" text
    .replace(/video\s*/gi, '') // Remove "video" text
    .replace(/audio\s*/gi, '') // Remove "audio" text
    .replace(/hd\s*/gi, '') // Remove "HD" text
    .replace(/4k\s*/gi, '') // Remove "4K" text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
  
  // Extract just the main song title (usually the first part before |)
  const mainParts = cleaned.split('|')[0]?.trim();
  if (mainParts && mainParts.length > 0) {
    cleaned = mainParts;
  }
  
  // If still too long, take first few words
  const words = cleaned.split(' ');
  if (words.length > 5) {
    cleaned = words.slice(0, 4).join(' ');
  }
  
  return cleaned;
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
        description: 'The music to search/query',
        required: false
      },
      {
        name: 'query-lyrics-no-auto-complete',
        type: ApplicationCommandOptionType.String,
        description: 'The music to search/query - doesn\'t utilize auto-complete, meaning your query won\'t be modified',
        required: false
      }
    ]
  },

  // eslint-disable-next-line sonarjs/cognitive-complexity
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Get current track from either Lavalink or discord-player
    let currentTrackTitle;
    if (process.env.USE_LAVALINK === 'true') {
      const queue = client.queues?.get(guild.id);
      currentTrackTitle = queue?.current?.info?.title;
    } else {
      currentTrackTitle = useQueue(guild.id)?.currentTrack?.title;
    }

    let query = interaction.options.getString('query-lyrics') 
      ?? interaction.options.getString('query-lyrics-no-auto-complete') 
      ?? currentTrackTitle;
    
    if (!query) {
      interaction.reply({
        content: `${emojis.error} ${member}, please provide a query, currently playing song can only be used when playback is active - this command has been cancelled`
      });
      return;
    }

    // Check state
    if (!requireSessionConditions(interaction, false, false, false)) return;

    // Let's defer the interaction as things can take time to process
    await interaction.deferReply();

    const originalQuery = query;
    query = optimizeLyricsQuery(query.toLowerCase());

    try {
      const res = await lyricsExtractor
        .search(query)
        .catch(() => null);

      // If first search fails, try with more simplified query
      if (!res) {
        console.log(`First search failed for "${query}", trying simplified version...`);
        
        // Further simplify the query
        const simplifiedQuery = query.split(' ').slice(0, 3).join(' ');
        const res2 = await lyricsExtractor
          .search(simplifiedQuery)
          .catch(() => null);
          
        if (res2) {
          // Use the successful result
          const {
            title,
            fullTitle,
            thumbnail,
            image,
            url,
            artist,
            lyrics
          } = res2;

          let description = lyrics;
          if (description && description.length > EMBED_DESCRIPTION_MAX_LENGTH) {
            description = description.slice(0, EMBED_DESCRIPTION_MAX_LENGTH - 3) + '...';
          }

          const lyricsEmbed = new EmbedBuilder()
            .setColor(colorResolver())
            .setTitle(title ?? 'Unknown')
            .setAuthor({
              name: artist?.name ?? 'Unknown',
              url: artist?.url ?? null,
              iconURL: artist?.image ?? null
            })
            .setDescription(description ?? 'Instrumental')
            .setURL(url);

          if (image || thumbnail) lyricsEmbed.setImage(image ?? thumbnail);
          if (fullTitle) lyricsEmbed.setFooter({ text: fullTitle });

          await interaction.editReply({ 
            embeds: [lyricsEmbed],
            content: `${emojis.success} ${member}, found lyrics for simplified query: **\`${simplifiedQuery}\`**`
          });
          return;
        }
        
        interaction.editReply({
          content: `${emojis.error} ${member}, could not find lyrics for **\`${originalQuery}\`**\n\nTried searching for: **\`${query}\`** and **\`${simplifiedQuery}\`**\nPlease try a more specific song title.`
        });
        return;
      }

      const {
        title,
        fullTitle,
        thumbnail,
        image,
        url,
        artist,
        lyrics
      } = res;

      let description = lyrics;
      if (description && description.length > EMBED_DESCRIPTION_MAX_LENGTH) {
        description = description.slice(0, EMBED_DESCRIPTION_MAX_LENGTH - 3) + '...';
      }

      const lyricsEmbed = new EmbedBuilder()
        .setColor(colorResolver())
        .setTitle(title ?? 'Unknown')
        .setAuthor({
          name: artist?.name ?? 'Unknown',
          url: artist?.url ?? null,
          iconURL: artist?.image ?? null
        })
        .setDescription(description ?? 'Instrumental')
        .setURL(url);

      if (image || thumbnail) lyricsEmbed.setImage(image ?? thumbnail);
      if (fullTitle) lyricsEmbed.setFooter({ text: fullTitle });

      // Feedback
      await interaction.editReply({ embeds: [lyricsEmbed] });
    } catch (e) {
      interaction.editReply({
        content: `${emojis.error} ${member}, something went wrong:\n\n${e.message}`
      });
    }
  }
});
const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { useQueue } = require('discord-player');
const { colorResolver } = require('../../util');
const { EMBED_DESCRIPTION_MAX_LENGTH } = require('../../constants');
const { requireSessionConditions } = require('../../modules/music');
const { searchLyrics, searchLyricsMultiple } = require('../../modules/lrclib-lyrics');

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
    
    let query = interaction.options.getString('query-lyrics') ?? interaction.options.getString('query-lyrics-no-auto-complete') ?? currentTrackTitle;
    if (!query) {
      interaction.reply(`${ emojis.error } ${ member }, please provide a query, currently playing song can only be used when playback is active - this command has been cancelled`);
      return;
    }

    // Check state
    if (!requireSessionConditions(interaction, false, false, false)) return;

    // Let's defer the interaction as things can take time to process
    await interaction.deferReply();

    // Get current track info for better search
    let currentTrack, artistName, trackDuration;
    if (process.env.USE_LAVALINK === 'true') {
      const queue = client.queues?.get(guild.id);
      currentTrack = queue?.current;
      artistName = currentTrack?.info?.author;
      trackDuration = currentTrack?.info?.length;
    } else {
      const queue = useQueue(guild.id);
      currentTrack = queue?.currentTrack;
      artistName = currentTrack?.author;
      trackDuration = currentTrack?.durationMS;
    }

    // Parse query to separate track and artist
    const queryParts = query.split(' ');
    const parsedTrack = queryParts.slice(0, Math.ceil(queryParts.length / 2)).join(' ');
    const parsedArtist = queryParts.slice(Math.ceil(queryParts.length / 2)).join(' ') || artistName || 'Unknown';

    try {
      // Try LRCLIB API first (best results)
      let res = await searchLyrics(parsedTrack, parsedArtist, null, trackDuration);
      
      // If not found, try broader search
      if (!res) {
        res = await searchLyricsMultiple(query, parsedArtist);
      }

      if (!res || (!res.plainLyrics && !res.instrumental)) {
        interaction.editReply(`${ emojis.error } ${ member }, could not find lyrics for **\`${ query }\`**. Try being more specific or check the spelling.`);
        return;
      }

      let description = res.instrumental ? '🎵 *This is an instrumental track*' : res.plainLyrics;
      if (description && description.length > EMBED_DESCRIPTION_MAX_LENGTH) {
        description = description.slice(0, EMBED_DESCRIPTION_MAX_LENGTH - 3) + '...';
      }

      const lyricsEmbed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle(`${res.trackName || query}`)
        .setAuthor({ name: res.artistName || parsedArtist })
        .setDescription(description || 'No lyrics available')
        .setFooter({ text: res.albumName ? `Album: ${res.albumName}` : 'Powered by LRCLIB' });

      const components = [];
      
      // Add Live Lyrics button if synced lyrics are available
      if (res.syncedLyrics && currentTrack) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`@live-lyrics@${guild.id}`)
            .setLabel('🎤 Live Lyrics')
            .setStyle(ButtonStyle.Primary)
        );
        components.push(row);
        
        // Store synced lyrics in client cache for the button
        if (!client.syncedLyricsCache) client.syncedLyricsCache = new Map();
        client.syncedLyricsCache.set(guild.id, {
          syncedLyrics: res.syncedLyrics,
          trackName: res.trackName || query,
          artistName: res.artistName || parsedArtist,
          startTime: Date.now() - (currentTrack.info?.position || 0)
        });
      }

      // Feedback
      const lyricsMessage = await interaction.editReply({ 
        embeds: [lyricsEmbed],
        components
      });
      
      // Track lyrics message for cleanup when song ends
      if (process.env.USE_LAVALINK === 'true') {
        const queue = client.queues?.get(guild.id);
        if (queue) {
          if (!queue.lyricsMessages) queue.lyricsMessages = [];
          queue.lyricsMessages.push({ 
            message: lyricsMessage,
            interactionId: interaction.id 
          });
        }
      } else {
        const queue = useQueue(guild.id);
        if (queue) {
          if (!queue.metadata.lyricsMessages) queue.metadata.lyricsMessages = [];
          queue.metadata.lyricsMessages.push({ 
            message: lyricsMessage,
            interactionId: interaction.id 
          });
        }
      }
    }
    catch (e) {
      interaction.editReply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

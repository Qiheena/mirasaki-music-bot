const { ComponentCommand } = require('../../classes/Commands');
const { EmbedBuilder } = require('discord.js');
const { parseSyncedLyrics } = require('../../modules/lrclib-lyrics');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Extract guild ID from custom ID (format: @live-lyrics@{guildId})
    const guildId = interaction.customId.split('@')[2];
    
    if (!client.syncedLyricsCache || !client.syncedLyricsCache.has(guildId)) {
      return interaction.reply({ 
        content: `${emojis.error} ${member}, synced lyrics are no longer available. Please use \`/lyrics\` command again.`,
        ephemeral: true 
      });
    }

    const lyricsData = client.syncedLyricsCache.get(guildId);
    const parsedLyrics = parseSyncedLyrics(lyricsData.syncedLyrics);

    if (parsedLyrics.length === 0) {
      return interaction.reply({ 
        content: `${emojis.error} ${member}, no synced lyrics available for this track.`,
        ephemeral: true 
      });
    }

    await interaction.deferReply();

    // Calculate current position in song
    const elapsedTime = Date.now() - lyricsData.startTime;
    
    // Find current lyric line
    let currentIndex = 0;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time <= elapsedTime) {
        currentIndex = i;
      } else {
        break;
      }
    }

    // Build live lyrics display (show 3 lines before, current, and 3 after)
    const contextBefore = 3;
    const contextAfter = 3;
    const startIdx = Math.max(0, currentIndex - contextBefore);
    const endIdx = Math.min(parsedLyrics.length, currentIndex + contextAfter + 1);

    let lyricsText = '';
    for (let i = startIdx; i < endIdx; i++) {
      const line = parsedLyrics[i];
      const minutes = Math.floor(line.time / 60000);
      const seconds = Math.floor((line.time % 60000) / 1000);
      const timestamp = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
      
      if (i === currentIndex) {
        lyricsText += `**→ ${timestamp} ${line.text}** ✨\n`;
      } else {
        lyricsText += `${timestamp} ${line.text}\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(`🎤 Live Lyrics: ${lyricsData.trackName}`)
      .setAuthor({ name: lyricsData.artistName })
      .setDescription(lyricsText || 'No lyrics to display')
      .setFooter({ text: 'Synced lyrics powered by LRCLIB • Updates in real-time' })
      .setTimestamp();

    const message = await interaction.editReply({ embeds: [embed] });

    // Auto-update lyrics every 2 seconds for 30 seconds
    const updateInterval = setInterval(async () => {
      const newElapsedTime = Date.now() - lyricsData.startTime;
      
      // Find new current lyric line
      let newCurrentIndex = 0;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (parsedLyrics[i].time <= newElapsedTime) {
          newCurrentIndex = i;
        } else {
          break;
        }
      }

      // Only update if line changed
      if (newCurrentIndex !== currentIndex) {
        currentIndex = newCurrentIndex;
        
        const newStartIdx = Math.max(0, currentIndex - contextBefore);
        const newEndIdx = Math.min(parsedLyrics.length, currentIndex + contextAfter + 1);

        let newLyricsText = '';
        for (let i = newStartIdx; i < newEndIdx; i++) {
          const line = parsedLyrics[i];
          const minutes = Math.floor(line.time / 60000);
          const seconds = Math.floor((line.time % 60000) / 1000);
          const timestamp = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
          
          if (i === currentIndex) {
            newLyricsText += `**→ ${timestamp} ${line.text}** ✨\n`;
          } else {
            newLyricsText += `${timestamp} ${line.text}\n`;
          }
        }

        const newEmbed = new EmbedBuilder()
          .setColor(0xFF69B4)
          .setTitle(`🎤 Live Lyrics: ${lyricsData.trackName}`)
          .setAuthor({ name: lyricsData.artistName })
          .setDescription(newLyricsText || 'No lyrics to display')
          .setFooter({ text: 'Synced lyrics powered by LRCLIB • Updates in real-time' })
          .setTimestamp();

        try {
          await message.edit({ embeds: [newEmbed] });
        } catch (e) {
          // Stop updating if message was deleted
          clearInterval(updateInterval);
        }
      }
    }, 2000);

    // Stop updating after 60 seconds
    setTimeout(() => {
      clearInterval(updateInterval);
    }, 60000);
  }
});

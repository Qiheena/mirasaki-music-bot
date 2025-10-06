const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createMusicControlButtons(guildId, isPlaying = false, isPaused = false, hasHistory = false, autoplayEnabled = false, loopMode = 'off') {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('previous')
      .setLabel('⏮')
      .setStyle(hasHistory ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!hasHistory),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'resume' : 'pause')
      .setLabel(isPaused ? '▶️' : '⏸')
      .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('⏭')
      .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('loop')
      .setLabel(loopMode === 'track' ? '🔂' : loopMode === 'queue' ? '🔁' : '↻')
      .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('volume-down')
      .setLabel('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('volume-up')
      .setLabel('🔊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('autoplay')
      .setLabel('🎲')
      .setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue')
      .setLabel('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

module.exports = { createMusicControlButtons };

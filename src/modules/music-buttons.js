const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createMusicControlButtons(guildId, isPlaying = false, isPaused = false, hasHistory = false, autoplayEnabled = false, loopMode = 'off') {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('previous')
      .setLabel('Prev')
      .setStyle(hasHistory ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!hasHistory),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'resume' : 'pause')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isPlaying && !isPaused),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('loop')
      .setLabel(loopMode === 'track' ? 'Loop 1' : loopMode === 'queue' ? 'Loop All' : 'Loop')
      .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('volume-down')
      .setLabel('Vol -')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('volume-up')
      .setLabel('Vol +')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('autoplay')
      .setLabel('Auto')
      .setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

module.exports = { createMusicControlButtons };

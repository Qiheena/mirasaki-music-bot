const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createMusicControlButtons(guildId, isPlaying = false, isPaused = false, hasHistory = false, autoplayEnabled = false) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('previous')
      .setLabel('Previous')
      .setStyle(hasHistory ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!hasHistory),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'resume' : 'pause')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isPlaying)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('volume-down')
      .setLabel('Volume Down')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('volume-up')
      .setLabel('Volume Up')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('autoplay')
      .setLabel('Autoplay')
      .setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

module.exports = { createMusicControlButtons };

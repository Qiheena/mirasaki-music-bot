const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createMusicControlButtons(guildId, isPlaying = false, isPaused = false, hasHistory = false, autoplayEnabled = false) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('previous')
      .setEmoji('⏮️')
      .setStyle(hasHistory ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!hasHistory),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'resume' : 'pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(!isPlaying),
    new ButtonBuilder()
      .setCustomId('next')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isPlaying)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('volume-down')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('volume-up')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('autoplay')
      .setEmoji('🔁')
      .setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

module.exports = { createMusicControlButtons };

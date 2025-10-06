const logger = require('@mirasaki/logger');
const {
  colorResolver, msToHumanReadableTime, clientConfig
} = require('./util');
const { EmbedBuilder, escapeMarkdown } = require('discord.js');
const { getGuildSettings } = require('./modules/db');
const { MS_IN_ONE_SECOND, EMBED_DESCRIPTION_MAX_LENGTH } = require('./constants');
const { createMusicControlButtons } = require('./modules/music-buttons');

module.exports = (player) => {
  // this event is emitted whenever discord-player starts to play a track
  player.events.on('playerStart', async (queue, track) => {
    if (queue.metadata.messages && queue.metadata.messages.length > 0) {
      for (const message of queue.metadata.messages) {
        try {
          await message.delete().catch(() => {});
        } catch (e) {
        }
      }
      queue.metadata.messages = [];
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setDescription([
        '**Started Playing Song**',
        '',
        `**Title:** [${ escapeMarkdown(track.title) }](${ track.url })`,
        `**Author:** ${ track.author }`,
        `**Duration:** ${ track.duration }`,
        `**Requested by:** @${ queue.metadata.member?.user?.username || 'Unknown' }`,
        '',
        `<t:${Math.floor(Date.now() / 1000)}:R> || ❤️ RasaVedic`
      ].join('\n'))
      .setThumbnail(track.thumbnail);

    const buttons = createMusicControlButtons(
      queue.guild.id,
      true,
      queue.node.isPaused(),
      queue.history.tracks.data.length > 0,
      queue.repeatMode === 3
    );

    const nowPlayingMessage = await queue.metadata.channel.send({
      embeds: [embed],
      components: buttons
    });

    if (nowPlayingMessage) {
      if (!queue.metadata.messages) queue.metadata.messages = [];
      queue.metadata.messages.push(nowPlayingMessage);
    }
  });

  player.events.on('error', (queue, error) => {
    // Emitted when the player encounters an error
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Player Error',
        description: error.message.slice(0, EMBED_DESCRIPTION_MAX_LENGTH)
      }
    ] });
  });

  player.events.on('playerError', (err) => {
    logger.syserr('Music Player encountered unexpected error:');
    logger.printErr(err);
  });

  player.events.on('audioTrackAdd', (queue, track) => {
    // Emitted when the player adds a single song to its queue
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Track Enqueued',
        description: `[${ escapeMarkdown(track.title) }](${ track.url })`
      }
    ] });
  });

  player.events.on('audioTracksAdd', (queue, tracks) => {
    // Emitted when the player adds multiple songs to its queue
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Multiple Tracks Enqueued',
        description: `**${ tracks.length }** Tracks\nFirst entry: [${ escapeMarkdown(tracks[1].title) }](${ tracks[1].url })`
      }
    ] });
  });

  player.events.on('audioTrackRemove', (queue, track) => {
    // Emitted when the player adds multiple songs to its queue
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Track Removed',
        description: `[${ escapeMarkdown(track.title) }](${ track.url })`
      }
    ] });
  });

  player.events.on('audioTracksRemove', (queue, tracks) => {
    // Emitted when the player adds multiple songs to its queue
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Multiple Tracks Removed',
        description: `**${ tracks.length }** Tracks\nFirst entry: [${ escapeMarkdown(tracks[0].title) }](${ tracks[0].url })`
      }
    ] });
  });

  player.events.on('playerSkip', (queue, track) => {
    // Emitted when the audio player fails to load the stream for a song
    queue.metadata.channel.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Player Skip',
        description: `Track skipped because the audio stream couldn't be extracted: [${ escapeMarkdown(track.title) }](${ track.url })`
      }
    ] });
  });

  player.events.on('disconnect', async (queue) => {
    if (queue.metadata.messages && queue.metadata.messages.length > 0) {
      for (const message of queue.metadata.messages) {
        try {
          await message.delete().catch(() => {});
        } catch (e) {
        }
      }
      queue.metadata.messages = [];
    }

    queue.metadata.channel.send({ embeds: [
      {
        color: 0xFF69B4,
        title: 'Finished Playing',
        description: 'Queue is now empty, leaving the channel'
      }
    ] });
  });

  player.events.on('emptyChannel', (queue) => {
    const settings = getGuildSettings(queue.guild.id);
    if (!settings) return;
    const ctx = { embeds: [
      {
        color: colorResolver(),
        title: 'Channel Empty'
      }
    ] };
    if (!settings.leaveOnEmpty) ctx.embeds[0].description = 'Staying in channel as leaveOnEnd is disabled';
    else ctx.embeds[0].description = `Leaving empty channel in ${ msToHumanReadableTime(
      (settings.leaveOnEmptyCooldown ?? clientConfig.defaultLeaveOnEndCooldown) * MS_IN_ONE_SECOND
    ) }`;
    // Emitted when the voice channel has been empty for the set threshold
    // Bot will automatically leave the voice channel with this event
    queue.metadata.channel.send(ctx);
  });

  player.events.on('emptyQueue', async (queue) => {
    const settings = getGuildSettings(queue.guild.id);
    
    if (queue.metadata.messages && queue.metadata.messages.length > 0) {
      for (const message of queue.metadata.messages) {
        try {
          await message.delete().catch(() => {});
        } catch (e) {
        }
      }
      queue.metadata.messages = [];
    }

    queue.metadata.channel.send({ embeds: [
      {
        color: 0xFF69B4,
        title: 'Queue Empty',
        description: `Queue is now empty, use **\`/play\`** to add something\nLeaving channel in ${ msToHumanReadableTime((settings.leaveOnEndCooldown ?? clientConfig.defaultLeaveOnEndCooldown) * MS_IN_ONE_SECOND) } if no songs are added/enqueued`
      }
    ] });
  });

  if (process.env.DEBUG_ENABLED === 'true') {
    player.events.on('debug', async (queue, message) => {
      // Emitted when the player queue sends debug info
      // Useful for seeing what state the current queue is at
      console.log(`Player debug event: ${ message }`);
    });
  }
};

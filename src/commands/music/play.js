const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  requireSessionConditions, ALLOWED_CONTENT_TYPE, musicEventChannel
} = require('../../modules/music');
const { clientConfig, isAllowedContentType, colorResolver } = require('../../util');
const { getGuildSettings } = require('../../modules/db');
const { MS_IN_ONE_SECOND } = require('../../constants');
const { msToTime } = require('../../lavalink-setup');
const { createMusicControlButtons } = require('../../modules/music-buttons');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['p', 'pl'],
  data: {
    description: 'Play a song. Query SoundCloud, search Vimeo, provide a direct link, etc.',
    options: [
      {
        name: 'query',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The music to search/query',
        required: true
      },
      {
        name: 'file',
        type: ApplicationCommandOptionType.Attachment,
        description: 'The audio file to play',
        required: false
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;
    const query = interaction.options.getString('query', true);
    const attachment = interaction.options.getAttachment('file');

    // Quick check: user must be in voice channel
    const channel = member.voice?.channel;
    if (!channel) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, you must be in a voice channel to use this command!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Check permissions before joining
    if (!channel.viewable || !channel.joinable) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, I don't have permission to join your voice channel!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (channel.full && !channel.members.some((m) => m.id === client.user.id)) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, your voice channel is full!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Join voice channel IMMEDIATELY
    let searchMessage;
    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
        if (!node) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no Lavalink nodes connected. Try again later.`);
          const errorMsg = await interaction.reply({ embeds: [errorEmbed], withResponse: true });
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          return;
        }

        let player = client.players.get(guild.id);
        if (!player) {
          player = await client.lavalink.joinVoiceChannel({
            guildId: guild.id,
            channelId: channel.id,
            shardId: guild.shardId ?? 0,
            deaf: true
          });
          client.players.set(guild.id, player);
        }
      }
    } catch (joinError) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, failed to join voice channel: ${joinError.message}`);
      const errorMsg = await interaction.reply({ embeds: [errorEmbed], withResponse: true });
      setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
      return;
    }

    // Send "Starting play" message
    const { createInfoEmbed } = require('../../modules/embed-utils');
    const startEmbed = createInfoEmbed(`▶️ Starting play **${query}**`);
    searchMessage = await interaction.reply({ embeds: [startEmbed], withResponse: true });

    // Return if attachment content type is not allowed
    if (attachment) {
      const contentIsAllowed = isAllowedContentType(ALLOWED_CONTENT_TYPE, attachment?.contentType ?? 'unknown');
      if (!contentIsAllowed.strict) {
        const { createErrorEmbed } = require('../../modules/embed-utils');
        const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, file rejected. Content type is not **\`${ ALLOWED_CONTENT_TYPE }\`**, received **\`${ attachment.contentType ?? 'unknown' }\`** instead.`);
        await searchMessage.edit({ embeds: [errorEmbed] });
        setTimeout(() => searchMessage.delete().catch(() => {}), 10000);
        return;
      }
    }

    try {
      // Check if Lavalink is being used
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        // Use Shoukaku (Lavalink) - get first available node
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2); // state 2 = connected
        if (!node) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no Lavalink nodes are connected. Please try again later.`);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Search for the track with improved accuracy
        const searchQuery = attachment?.url ?? query;
        let searchPrefix = 'ytsearch:';
        
        // Improve search accuracy by detecting source
        if (searchQuery.toLowerCase().includes('soundcloud')) searchPrefix = 'scsearch:';
        else if (searchQuery.toLowerCase().includes('spotify')) searchPrefix = 'spsearch:';
        else if (searchQuery.toLowerCase().includes('youtube') || searchQuery.toLowerCase().includes('youtu.be')) searchPrefix = 'ytsearch:';
        
        const result = await node.rest.resolve(searchQuery.startsWith('http') ? searchQuery : `${searchPrefix}${searchQuery}`);
        
        if (!result || (result.loadType === 'empty' || result.loadType === 'error')) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Get or create player
        let player = client.players.get(guild.id);
        if (!player) {
          player = await client.lavalink.joinVoiceChannel({
            guildId: guild.id,
            channelId: channel.id,
            shardId: guild.shardId ?? 0,
            deaf: true
          });
          client.players.set(guild.id, player);
        }

        // Get or create queue
        let queue = client.queues.get(guild.id);
        if (!queue) {
          const { createQueue } = require('../../lavalink-setup');
          const { setupPlayerEvents } = require('../../modules/player-events');
          const { startVoiceActivityMonitor } = require('../../modules/voice-activity');
          const settings = await getGuildSettings(guild.id);
          
          let eventChannel = interaction.channel;
          if (settings.useThreadSessions) {
            eventChannel = await musicEventChannel(client, interaction);
            if (eventChannel === false) return;
          }

          queue = createQueue(guild.id, {
            channel: eventChannel,
            member,
            timestamp: interaction.createdTimestamp,
            voiceChannel: channel
          });
          
          queue.volume = Math.min(100, settings.volume ?? clientConfig.defaultVolume);
          client.queues.set(guild.id, queue);

          setupPlayerEvents(client, guild.id, player, queue, emojis);
          startVoiceActivityMonitor(client, guild.id);
        }

        // Handle playlist or single track
        let tracks = [];
        if (result.loadType === 'playlist') {
          tracks = result.data.tracks.map(track => ({
            track: track.encoded,
            info: track.info,
            requester: interaction.user
          }));
        } else if (result.loadType === 'track') {
          tracks = [{
            track: result.data.encoded,
            info: result.data.info,
            requester: interaction.user
          }];
        } else if (result.loadType === 'search') {
          tracks = [{
            track: result.data[0].encoded,
            info: result.data[0].info,
            requester: interaction.user
          }];
        }

        if (tracks.length === 0) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\``);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Clear any disconnect timeout since we're adding new tracks
        if (queue.disconnectTimeout) {
          clearTimeout(queue.disconnectTimeout);
          queue.disconnectTimeout = null;
        }

        // Add tracks to queue
        const firstTrack = tracks[0];
        tracks.forEach(track => queue.add(track));

        // If nothing is playing, start playback
        if (!player.track) {
          const track = queue.next();
          if (track) {
            await player.playTrack({ track: { encoded: track.track } });
            await player.setGlobalVolume(queue.volume);
            
            const indiaTime = Math.floor((Date.now() + 19800000) / 1000);
            
            // Enhanced metadata
            const source = track.info.sourceName || 'Unknown';
            const isLive = track.info.isStream || false;
            
            const embed = new EmbedBuilder()
              .setColor(0xFF69B4)
              .setTitle(track.info.title)
              .setURL(track.info.uri)
              .setDescription([
                `**🎤 Artist:** ${track.info.author || 'Unknown'}`,
                `**⏱️ Duration:** ${isLive ? '🔴 LIVE' : msToTime(track.info.length)}`,
                `**📡 Source:** ${source.toUpperCase()}`,
                `**👤 Requested by:** <@${track.requester.id}>`,
                '',
                `<t:${indiaTime}:T> || ❤️ made by @rasavedic ❤️`
              ].join('\n'))
              .setThumbnail(track.info.artworkUrl);

            const buttons = createMusicControlButtons(
              guild.id,
              true,
              false,
              queue.history.length > 0,
              queue.autoplay,
              queue.loop
            );

            const nowPlayingMessage = await queue.metadata.channel?.send({
              embeds: [embed],
              components: buttons
            });

            if (nowPlayingMessage) {
              queue.currentMessage = nowPlayingMessage;
            }
          }
        }

        // Feedback with embed
        const { createSuccessEmbed } = require('../../modules/embed-utils');
        const trackTitle = firstTrack.info.title;
        const feedbackEmbed = tracks.length > 1 
          ? createSuccessEmbed(`${emojis.success} ${member}, enqueued **${tracks.length}** tracks! First: **\`${trackTitle}\`**`)
          : createSuccessEmbed(`${emojis.success} ${member}, enqueued **\`${trackTitle}\`**!`);
        
        await interaction.editReply({ embeds: [feedbackEmbed] });

      } else {
        // Use discord-player (fallback)
        const { useMainPlayer, useQueue, EqualizerConfigurationPreset } = require('discord-player');
        const player = useMainPlayer();

        const searchResult = await player
          .search(attachment?.url ?? query, { requestedBy: interaction.user })
          .catch(() => null);
        
        if (!searchResult || !searchResult.hasTracks()) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const settings = await getGuildSettings(guild.id);
        let eventChannel = interaction.channel;
        if (settings.useThreadSessions) {
          eventChannel = await musicEventChannel(client, interaction);
          if (eventChannel === false) return;
        }

        let volume = settings.volume ?? clientConfig.defaultVolume;
        volume = Math.min(100, volume);

        const leaveOnEndCooldown = ((settings.leaveOnEndCooldown ?? 2) * MS_IN_ONE_SECOND);
        const leaveOnEmptyCooldown = ((settings.leaveOnEmptyCooldown ?? 2) * MS_IN_ONE_SECOND);

        const { track } = await player.play(
          channel,
          searchResult,
          {
            requestedBy: interaction.user,
            nodeOptions: {
              skipOnNoStream: true,
              leaveOnEnd: true,
              leaveOnEndCooldown,
              leaveOnEmpty: settings.leaveOnEmpty,
              leaveOnEmptyCooldown,
              volume,
              metadata: {
                channel: eventChannel,
                member,
                timestamp: interaction.createdTimestamp
              }
            }
          }
        );

        const queue = useQueue(guild.id);
        if (Number.isInteger(settings.repeatMode)) queue.setRepeatMode(settings.repeatMode);

        if (queue.filters.equalizer && settings.equalizer && settings.equalizer !== 'null') {
          queue.filters.equalizer.setEQ(EqualizerConfigurationPreset[settings.equalizer]);
          queue.filters.equalizer.enable();
        } else if (queue.filters?.equalizer) {
          queue.filters.equalizer.disable();
        }

        const { createSuccessEmbed } = require('../../modules/embed-utils');
        const successEmbed = createSuccessEmbed(`${ emojis.success } ${ member }, enqueued **\`${ track.title }\`**!`);
        await interaction.editReply({ embeds: [successEmbed] });
      }
    } catch (e) {
      console.error('Play command error:', e);
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorMessage = e.message || 'Unknown error occurred';
      const maxLength = 1900;
      const truncatedMessage = errorMessage.length > maxLength 
        ? errorMessage.substring(0, maxLength) + '...\n\n(Error message truncated)'
        : errorMessage;
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, something went wrong:\n\n${truncatedMessage}`);
      interaction.editReply({ embeds: [errorEmbed] });
    }
  }
});

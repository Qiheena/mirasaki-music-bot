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
      return interaction.reply({ content: `${ emojis.error } ${ member }, you must be in a voice channel to use this command!`, ephemeral: true });
    }

    // Check permissions before joining
    if (!channel.viewable || !channel.joinable) {
      return interaction.reply({ content: `${ emojis.error } ${ member }, I don't have permission to join your voice channel!`, ephemeral: true });
    }

    if (channel.full && !channel.members.some((m) => m.id === client.user.id)) {
      return interaction.reply({ content: `${ emojis.error } ${ member }, your voice channel is full!`, ephemeral: true });
    }

    // Join voice channel IMMEDIATELY
    let searchMessage;
    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
        if (!node) {
          const errorMsg = await interaction.reply({ content: `${ emojis.error } ${ member }, no Lavalink nodes connected. Try again later.`, withResponse: true });
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
      const errorMsg = await interaction.reply({ content: `${ emojis.error } ${ member }, failed to join voice channel: ${joinError.message}`, withResponse: true });
      setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
      return;
    }

    // Send "Starting play" message
    searchMessage = await interaction.reply({ content: `▶️ Starting play **${query}**`, withResponse: true });

    // Return if attachment content type is not allowed
    if (attachment) {
      const contentIsAllowed = isAllowedContentType(ALLOWED_CONTENT_TYPE, attachment?.contentType ?? 'unknown');
      if (!contentIsAllowed.strict) {
        await searchMessage.edit({ content: `${ emojis.error } ${ member }, file rejected. Content type is not **\`${ ALLOWED_CONTENT_TYPE }\`**, received **\`${ attachment.contentType ?? 'unknown' }\`** instead.` });
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
          interaction.editReply(`${ emojis.error } ${ member }, no Lavalink nodes are connected. Please try again later.`);
          return;
        }

        // Search for the track
        const searchQuery = attachment?.url ?? query;
        const result = await node.rest.resolve(searchQuery.startsWith('http') ? searchQuery : `ytsearch:${searchQuery}`);
        
        if (!result || (result.loadType === 'empty' || result.loadType === 'error')) {
          interaction.editReply(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
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
          const settings = getGuildSettings(guild.id);
          
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

          // Set up player events
          player.on('end', async (data) => {
            if (data.reason === 'replaced') return;
            
            if (queue.currentMessage) {
              try {
                await queue.currentMessage.delete().catch(() => {});
              } catch (e) {
              }
              queue.currentMessage = null;
            }
            
            let nextTrack = queue.next();
            
            if (!nextTrack && queue.autoplay && queue.current) {
              try {
                const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
                if (node) {
                  const searchQuery = `${queue.current.info.author} ${queue.current.info.title}`;
                  const result = await node.rest.resolve(`ytsearch:${searchQuery}`);
                  
                  if (result && result.loadType === 'search' && result.data.length > 1) {
                    const recommendedTrack = result.data[1];
                    nextTrack = {
                      track: recommendedTrack.encoded,
                      info: recommendedTrack.info,
                      requester: queue.current.requester
                    };
                    queue.add(nextTrack);
                    nextTrack = queue.next();
                  }
                }
              } catch (e) {
                console.error('Autoplay error:', e);
              }
            }
            
            if (nextTrack) {
              await player.playTrack({ track: { encoded: nextTrack.track } });
              
              const indiaTime = Math.floor((Date.now() + 19800000) / 1000);
              const embed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle(nextTrack.info.title)
                .setURL(nextTrack.info.uri)
                .setDescription([
                  `**Author:** ${nextTrack.info.author || 'Unknown'}`,
                  `**Duration:** ${msToTime(nextTrack.info.length)}`,
                  `**Requested by:** <@${nextTrack.requester.id}>`,
                  '',
                  `<t:${indiaTime}:T> || ❤️ made by @rasavedic ❤️`
                ].join('\n'))
                .setThumbnail(nextTrack.info.artworkUrl);

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
            } else {
              if (queue.disconnectTimeout) {
                clearTimeout(queue.disconnectTimeout);
              }
              
              queue.disconnectTimeout = setTimeout(async () => {
                if (queue.tracks.length === 0 && !queue.current && !player.track) {
                  if (queue.currentMessage) {
                    try {
                      await queue.currentMessage.delete().catch(() => {});
                    } catch (e) {
                    }
                  }
                  client.lavalink.leaveVoiceChannel(guild.id);
                  client.queues.delete(guild.id);
                  client.players.delete(guild.id);
                }
              }, 60000);
            }
          });

          player.on('exception', (data) => {
            console.error('Player exception:', data);
            queue.metadata.channel?.send(`${ emojis.error } An error occurred while playing: ${data.exception?.message || 'Unknown error'}`);
          });
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
          interaction.editReply(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\``);
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
            const embed = new EmbedBuilder()
              .setColor(0xFF69B4)
              .setTitle(track.info.title)
              .setURL(track.info.uri)
              .setDescription([
                `**Author:** ${track.info.author || 'Unknown'}`,
                `**Duration:** ${msToTime(track.info.length)}`,
                `**Requested by:** <@${track.requester.id}>`,
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

        // Feedback
        const trackTitle = firstTrack.info.title;
        if (tracks.length > 1) {
          await interaction.editReply(`${ emojis.success } ${ member }, enqueued **${tracks.length}** tracks! First: **\`${ trackTitle }\`**`);
        } else {
          await interaction.editReply(`${ emojis.success } ${ member }, enqueued **\`${ trackTitle }\`**!`);
        }

      } else {
        // Use discord-player (fallback)
        const { useMainPlayer, useQueue, EqualizerConfigurationPreset } = require('discord-player');
        const player = useMainPlayer();

        const searchResult = await player
          .search(attachment?.url ?? query, { requestedBy: interaction.user })
          .catch(() => null);
        
        if (!searchResult || !searchResult.hasTracks()) {
          interaction.editReply(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
          return;
        }

        const settings = getGuildSettings(guild.id);
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

        await interaction.editReply(`${ emojis.success } ${ member }, enqueued **\`${ track.title }\`**!`);
      }
    } catch (e) {
      console.error('Play command error:', e);
      const errorMessage = e.message || 'Unknown error occurred';
      const maxLength = 1900;
      const truncatedMessage = errorMessage.length > maxLength 
        ? errorMessage.substring(0, maxLength) + '...\n\n(Error message truncated)'
        : errorMessage;
      interaction.editReply(`${ emojis.error } ${ member }, something went wrong:\n\n${ truncatedMessage }`);
    }
  }
});

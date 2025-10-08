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

    // Check if user is in a voice channel
    const channel = member.voice?.channel;
    if (!channel) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, you must be in a voice channel to use this command!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (!channel.viewable || !channel.joinable) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, I don't have permission to join your voice channel!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (channel.full && !channel.members.some(m => m.id === client.user.id)) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, your voice channel is full!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    let searchMessage;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
        if (!node) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, no Lavalink nodes connected. Try again later.`);
          const errorMsg = await interaction.reply({ embeds: [errorEmbed], withResponse: true });
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          return;
        }
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

      // Send "Starting play" message
      const { createInfoEmbed } = require('../../modules/embed-utils');
      const startEmbed = createInfoEmbed(`🌷 Added To Queue **${query}**`);
      searchMessage = await interaction.reply({ embeds: [startEmbed], withResponse: true });

      if (attachment) {
        const contentIsAllowed = isAllowedContentType(ALLOWED_CONTENT_TYPE, attachment?.contentType ?? 'unknown');
        if (!contentIsAllowed.strict) {
  const { createErrorEmbed } = require('../../modules/embed-utils');
  const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, file rejected. Content type is not **\`${ALLOWED_CONTENT_TYPE}\`**, received **\`${attachment.contentType ?? 'unknown'}\`** instead.`);
  await searchMessage.edit({ embeds: [errorEmbed] });
  setTimeout(() => searchMessage.delete().catch(() => {}), 10000);
          return;
        }
      }

      // Search and play logic ...
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const node = [...client.lavalink.nodes.values()].find(n => n.state === 2);
        if (!node) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, no Lavalink nodes are connected. Please try again later.`);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const searchQuery = attachment?.url ?? query;
        let searchPrefix = 'ytsearch:';

        if (searchQuery.toLowerCase().includes('soundcloud'))
          searchPrefix = 'scsearch:';
        else if (searchQuery.toLowerCase().includes('spotify'))
          searchPrefix = 'spsearch:';
        else if (searchQuery.toLowerCase().includes('youtube') || searchQuery.toLowerCase().includes('youtu.be'))
          searchPrefix = 'ytsearch:';

        const result = await node.rest.resolve(searchQuery.startsWith('http') ? searchQuery : `${searchPrefix}${searchQuery}`);

        if (!result || (result.loadType === 'empty' || result.loadType === 'error')) {
          const { createErrorEmbed } = require('../../modules/embed-utils');
          const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, no tracks found for query \`${query}\` - this command has been cancelled`);
          interaction.editReply({ embeds: [errorEmbed] });
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
          const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, no tracks found for query \`${query}\``);
          interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        // Clear disconnect timeout
        if (queue.disconnectTimeout) {
          clearTimeout(queue.disconnectTimeout);
          queue.disconnectTimeout = null;
        }

        // Add tracks to queue
        tracks.forEach(track => queue.add(track));

        // If nothing is playing, start playback
        if (!player.track) {
          const track = queue.next();
          if (track) {
            await player.playTrack({ track: { encoded: track.track } });
            await player.setGlobalVolume(queue.volume);

            const source = track.info.sourceName || 'Unknown';
            const isLive = track.info.isStream || false;

            // Build the embed with validation
            const embed = new EmbedBuilder().setColor(0xFF69B4);

            if (track.info.title && typeof track.info.title === 'string' && track.info.title.length <= 256) {
              embed.setTitle(track.info.title);
            } else {
              embed.setTitle('Untitled');
            }

            if (track.info.uri && typeof track.info.uri === 'string') {
              embed.setURL(track.info.uri);
            }

            const indiaTime = Math.floor((Date.now() + 19800000) / 1000);
            const desc = [
              `**🎤 Artist:** ${track.info.author || 'Unknown'}`,
              `**⏱️ Duration:** ${isLive ? '🔴 LIVE' : msToTime(track.info.length)}`,
              `**📡 Source:** ${source.toUpperCase()}`,
              `**👤 Requested by:** <@${track.requester.id}>`,
              '',
              `<t:${indiaTime}:T> || ❤️ made by @rasavedic ❤️`
            ].join('\n');

            embed.setDescription(desc.length <= 4096 ? desc : desc.slice(0, 4096));

            if (track.info.artworkUrl && typeof track.info.artworkUrl === 'string') {
              embed.setThumbnail(track.info.artworkUrl);
            }

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
              
              // Auto-delete now playing message based on guild settings
              const settings = await getGuildSettings(guild.id);
              if (settings.autoDeleteDuration && settings.autoDeleteDuration > 0) {
                setTimeout(async () => {
                  try {
                    await nowPlayingMessage.delete().catch(() => {});
                  } catch (e) {
                    // Ignore deletion errors
                  }
                }, settings.autoDeleteDuration * 1000);
              }
            }

            // Delete the initial "Added To Queue" message to keep chat clean
            if (searchMessage) {
              try {
                await searchMessage.delete();
              } catch (e) {
                // Ignore deletion errors
              }
            }

            const { createSuccessEmbed } = require('../../modules/embed-utils');
            const { autoDeleteMessage } = require('../../modules/auto-delete');
            const trackTitle = track.info.title || 'No Title';

            const feedbackEmbed = tracks.length > 1
              ? createSuccessEmbed(`${emojis.success} ${member}, enqueued **${tracks.length}** tracks! First: **\`${trackTitle}\`**`)
              : createSuccessEmbed(`${emojis.success} ${member}, enqueued **\`${trackTitle}\`**!`);

            const reply = await interaction.followUp({ embeds: [feedbackEmbed], fetchReply: true });
            await autoDeleteMessage(reply, 10000);
          }
        }
      } else {
        // Fallback to discord-player if needed...
      }
    } catch (e) {
      console.error('Play command error:', e);

      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorMessage = e.message || 'Unknown error occurred';
      const maxLength = 1900;
      const truncatedMessage = errorMessage.length > maxLength ? errorMessage.substring(0, maxLength) + '...\n\n(Error message truncated)' : errorMessage;

      const errorEmbed = createErrorEmbed(`${emojis.error} ${member}, something went wrong:

${truncatedMessage}`);
      interaction.editReply({ embeds: [errorEmbed] });
    }
  }
});
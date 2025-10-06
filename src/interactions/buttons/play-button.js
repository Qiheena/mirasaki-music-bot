const { ComponentCommand } = require('../../classes/Commands');
const { MS_IN_ONE_SECOND } = require('../../constants');
const { getGuildSettings } = require('../../modules/db');
const { requireSessionConditions, musicEventChannel } = require('../../modules/music');
const { clientConfig } = require('../../util');
const {
  useMainPlayer, useQueue, EqualizerConfigurationPreset
} = require('discord-player');
const player = useMainPlayer();

module.exports = new ComponentCommand({ run: async (client, interaction) => {
  const {
    guild, customId, member
  } = interaction;
  const { emojis } = client.container;
  const [
    , // @ char, marks dynamic command/action
    , // command name
    componentMemberId,
    url
  ] = customId.split('@');
  if (member.id !== componentMemberId) {
    interaction.reply(`${ emojis.error } ${ member }, this component isn't meant for you, use the \`/search\` command yourself - this action has been cancelled`);
    return;
  }

  // Check state
  if (!requireSessionConditions(interaction, false, true, false)) return;

  // Ok, safe to access voice channel and initialize
  const channel = member.voice?.channel;

  // Let's defer the interaction as things can take time to process
  await interaction.deferReply();

  try {
    // Resolve settings
    const settings = getGuildSettings(guild.id);

    // Use thread channels
    let eventChannel = interaction.channel;
    if (settings.useThreadSessions) {
      eventChannel = await musicEventChannel(client, interaction);
      if (eventChannel === false) return;
    }

    // Resolve volume for this session - clamp max 100
    let volume = settings.volume ?? clientConfig.defaultVolume;
    volume = Math.min(100, volume);

    // Resolve leave on end cooldown
    const leaveOnEndCooldown = ((settings.leaveOnEndCooldown ?? 2) * MS_IN_ONE_SECOND);
    const leaveOnEmptyCooldown = ((settings.leaveOnEmptyCooldown ?? 2) * MS_IN_ONE_SECOND);

    if (process.env.USE_LAVALINK === 'true') {
      // Lavalink implementation
      const node = client.lavalink.nodeMap.get('main');
      const result = await node.rest.resolve(url);
      
      if (!result?.tracks || result.tracks.length === 0) {
        await interaction.editReply(`${ emojis.error } ${ member }, no track found for the provided URL - this action has been cancelled`);
        return;
      }

      const trackData = result.tracks[0];
      const player = client.players?.get(guild.id);
      let queue = client.queues?.get(guild.id);

      if (!player || !player.track) {
        // Initialize new session
        const newPlayer = await client.lavalink.joinVoiceChannel({
          guildId: guild.id,
          channelId: channel.id,
          shardId: guild.shardId,
          deaf: true
        });

        if (!client.queues) client.queues = new Map();
        queue = {
          tracks: [],
          current: null,
          volume: volume,
          loop: 'off',
          metadata: {
            channel: eventChannel,
            member,
            timestamp: interaction.createdTimestamp
          }
        };
        client.queues.set(guild.id, queue);

        queue.current = {
          track: trackData.encoded,
          info: trackData.info,
          requester: interaction.user
        };

        await newPlayer.playTrack({ track: { encoded: trackData.encoded } });
        await newPlayer.setGlobalVolume(volume);
        await interaction.editReply(`${ emojis.success } ${ member }, now playing **\`${ trackData.info.title }\`**!`);
      } else {
        // Add to existing queue
        queue.tracks.push({
          track: trackData.encoded,
          info: trackData.info,
          requester: interaction.user
        });
        await interaction.editReply(`${ emojis.success } ${ member }, enqueued **\`${ trackData.info.title }\`**!`);
      }
    } else {
      // Discord-player implementation
      const { track } = await player.play(
        channel,
        url,
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

      // Use queue
      const queue = useQueue(guild.id);

      // Now that we have a queue initialized,
      // let's check if we should set our default repeat-mode
      if (Number.isInteger(settings.repeatMode)) queue.setRepeatMode(settings.repeatMode);

      // Set persistent equalizer preset
      if (
        queue.filters.equalizer
        && settings.equalizer
        && settings.equalizer !== 'null'
      ) {
        queue.filters.equalizer.setEQ(EqualizerConfigurationPreset[settings.equalizer]);
        queue.filters.equalizer.enable();
      }
      else if (queue.filters.equalizer) queue.filters.equalizer.disable();

      // Feedback
      await interaction.editReply(`${ emojis.success } ${ member }, enqueued **\`${ track.title }\`**!`);
    }
  }
  catch (e) {
    const errorMessage = e.message || 'Unknown error occurred';
    const maxLength = 1900;
    const truncatedMessage = errorMessage.length > maxLength 
      ? errorMessage.substring(0, maxLength) + '...\n\n(Error message truncated)'
      : errorMessage;
    interaction.editReply(`${ emojis.error } ${ member }, something went wrong:\n\n${ truncatedMessage }`);
  }
} });

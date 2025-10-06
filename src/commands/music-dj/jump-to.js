const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');

module.exports = new ChatInputCommand({
  global: true,
  data: {
    description: 'Jump to a specific track without removing other tracks',
    options: [
      {
        name: 'position',
        description: 'The song/track position to jump to',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 2,
        max_value: 999_999
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const {
      member, guild, options
    } = interaction;
    // Js 0 indexing offset
    const jumpToIndex = Number(options.getInteger('position')) - 1;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        const player = client.players.get(guild.id);
        
        if (!queue || queue.tracks.length === 0) {
          interaction.reply(`${ emojis.error } ${ member }, queue is currently empty - this command has been cancelled`);
          return;
        }

        // Check bounds
        const queueSizeZeroOffset = queue.tracks.length - 1;
        if (jumpToIndex > queueSizeZeroOffset) {
          interaction.reply(`${ emojis.error } ${ member }, there is nothing at track position ${ jumpToIndex + 1 }, the highest position is ${ queue.tracks.length } - this command has been cancelled`);
          return;
        }

        // Jump to track - rotate queue to preserve all tracks
        const targetTrack = queue.tracks[jumpToIndex];
        
        // Split queue into before and after target
        const beforeTarget = queue.tracks.slice(0, jumpToIndex);
        const afterTarget = queue.tracks.slice(jumpToIndex + 1);
        
        // Rebuild queue: tracks after target, then current (if exists), then tracks before target
        const newQueue = [...afterTarget];
        if (queue.current) {
          newQueue.push(queue.current);
        }
        newQueue.push(...beforeTarget);
        
        queue.tracks = newQueue;
        queue.current = targetTrack;
        await player.playTrack({ track: { encoded: targetTrack.track } });
        await interaction.reply(`${ emojis.success } ${ member }, jumping to **\`${ targetTrack.info.title }\`**!`);
      } else {
        // Check has queue
        const queue = useQueue(guild.id);
        if (queue.isEmpty()) {
          interaction.reply(`${ emojis.error } ${ member }, queue is currently empty - this command has been cancelled`);
          return;
        }

        // Check bounds
        const queueSizeZeroOffset = queue.size - 1;
        if (jumpToIndex > queueSizeZeroOffset) {
          interaction.reply(`${ emojis.error } ${ member }, there is nothing at track position ${ jumpToIndex + 1 }, the highest position is ${ queue.size } - this command has been cancelled`);
          return;
        }

        queue.node.jump(jumpToIndex);
        await interaction.reply(`${ emojis.success } ${ member }, jumping to **\`${ jumpToIndex + 1 }\`**!`);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

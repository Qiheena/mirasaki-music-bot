const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');
const { createMusicControlButtons } = require('../../modules/music-buttons');
const { autoDeleteMessage } = require('../../modules/auto-delete');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        const player = client.players.get(guild.id);
        
        if (!queue) {
          const reply = await interaction.reply({ content: `${ emojis.error } ${ member }, no active music session - this command has been cancelled`, fetchReply: true });
          await autoDeleteMessage(reply, 10000);
          return;
        }

        queue.autoplay = !queue.autoplay;
        
        if (queue?.currentMessage && player) {
          const buttons = createMusicControlButtons(
            guild.id,
            !player.paused && !!player.track,
            player.paused,
            queue.history.length > 0,
            queue.autoplay,
            queue.loop
          );
          
          try {
            await queue.currentMessage.edit({ components: buttons });
          } catch (e) {
          }
        }
        
        const reply = await interaction.reply({ content: `${ emojis.success } ${ member }, autoplay has been **${ queue.autoplay ? 'enabled' : 'disabled' }**`, fetchReply: true });
        await autoDeleteMessage(reply, 10000);
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          const reply = await interaction.reply({ content: `${ emojis.error } ${ member }, no active music session - this command has been cancelled`, fetchReply: true });
          await autoDeleteMessage(reply, 10000);
          return;
        }

        queue.setRepeatMode(queue.repeatMode === 3 ? 0 : 3);
        const isEnabled = queue.repeatMode === 3;
        
        if (queue.metadata?.messages && queue.metadata.messages.length > 0) {
          const loopMode = queue.repeatMode === 1 ? 'track' : queue.repeatMode === 2 ? 'queue' : 'off';
          const buttons = createMusicControlButtons(
            guild.id,
            !queue.node.isPaused(),
            queue.node.isPaused(),
            queue.history.tracks.data.length > 0,
            isEnabled,
            loopMode
          );
          
          try {
            await queue.metadata.messages[queue.metadata.messages.length - 1].edit({ components: buttons });
          } catch (e) {
          }
        }
        
        const reply = await interaction.reply({ content: `${ emojis.success } ${ member }, autoplay has been **${ isEnabled ? 'enabled' : 'disabled' }**`, fetchReply: true });
        await autoDeleteMessage(reply, 10000);
      }
    } catch (e) {
      const reply = await interaction.reply({ content: `${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`, fetchReply: true });
      await autoDeleteMessage(reply, 15000);
    }
  }
});

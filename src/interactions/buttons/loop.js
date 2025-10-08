const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');
const { createMusicControlButtons } = require('../../modules/music-buttons');
const { createSuccessEmbed, createErrorEmbed } = require('../../modules/embed-utils');
const { autoDeleteReply } = require('../../modules/auto-delete');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    await interaction.deferReply({ ephemeral: true });
    
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        const player = client.players.get(guild.id);
        
        if (!queue || !player) {
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no active music session - this command has been cancelled`);
          await interaction.editReply({ embeds: [errorEmbed] });
          await autoDeleteReply(interaction, 10000);
          return;
        }

        const loopModes = ['off', 'track', 'queue'];
        const currentIndex = loopModes.indexOf(queue.loop);
        const nextIndex = (currentIndex + 1) % loopModes.length;
        queue.loop = loopModes[nextIndex];
        
        const modeText = queue.loop === 'off' ? 'disabled' : queue.loop === 'track' ? 'track' : 'queue';
        
        if (queue.currentMessage) {
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
        
        const successEmbed = createSuccessEmbed(`${ emojis.success } ${ member }, loop mode: **${ modeText }**`);
        await interaction.editReply({ embeds: [successEmbed] });
        await autoDeleteReply(interaction, 10000);
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, no active music session - this command has been cancelled`);
          await interaction.editReply({ embeds: [errorEmbed] });
          await autoDeleteReply(interaction, 10000);
          return;
        }

        const currentMode = queue.repeatMode;
        const nextMode = currentMode === 0 ? 1 : currentMode === 1 ? 2 : 0;
        queue.setRepeatMode(nextMode);
        
        const loopMode = nextMode === 1 ? 'track' : nextMode === 2 ? 'queue' : 'off';
        const modeText = nextMode === 0 ? 'disabled' : nextMode === 1 ? 'track' : 'queue';
        
        if (queue.metadata?.messages && queue.metadata.messages.length > 0) {
          const buttons = createMusicControlButtons(
            guild.id,
            true,
            queue.node.isPaused(),
            queue.history.tracks.data.length > 0,
            queue.repeatMode === 3,
            loopMode
          );
          
          try {
            await queue.metadata.messages[queue.metadata.messages.length - 1].edit({ components: buttons });
          } catch (e) {
          }
        }
        
        const successEmbed = createSuccessEmbed(`${ emojis.success } ${ member }, loop mode: **${ modeText }**`);
        await interaction.editReply({ embeds: [successEmbed] });
        await autoDeleteReply(interaction, 10000);
      }
    } catch (e) {
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
      await interaction.editReply({ embeds: [errorEmbed] });
      await autoDeleteReply(interaction, 15000);
    }
  }
});

const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { usePlayer } = require('discord-player');
const { createMusicControlButtons } = require('../../modules/music-buttons');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        const queue = client.queues.get(guild.id);
        if (!player || !player.track) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        const newPauseState = !player.paused;
        await player.setPaused(newPauseState);
        
        if (queue?.currentMessage) {
          const buttons = createMusicControlButtons(
            guild.id,
            !newPauseState,
            newPauseState,
            queue.history.length > 0,
            queue.autoplay,
            queue.loop
          );
          
          try {
            await queue.currentMessage.edit({ components: buttons });
          } catch (e) {
          }
        }
        
        await interaction.reply(`${ emojis.success } ${ member }, ${ newPauseState ? 'paused' : 'resumed' } playback`);
      } else {
        const guildPlayerNode = usePlayer(guild.id);
        if (!guildPlayerNode) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        const newPauseState = !guildPlayerNode.isPaused();
        guildPlayerNode.setPaused(newPauseState);
        await interaction.reply(`${ emojis.success } ${ member }, ${ newPauseState ? 'paused' : 'resumed' } playback`);
      }
    } catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        const queue = client.queues.get(guild.id);
        
        if (!player || !queue) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }

        const newVolume = Math.min(100, queue.volume + 10);
        queue.volume = newVolume;
        await player.setGlobalVolume(newVolume);
        await interaction.reply(`${ emojis.success } ${ member }, volume increased to **${ newVolume }%**`);
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        
        const currentVolume = queue.node.volume;
        const newVolume = Math.min(100, currentVolume + 10);
        queue.node.setVolume(newVolume);
        await interaction.reply(`${ emojis.success } ${ member }, volume increased to **${ newVolume }%**`);
      }
    } catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

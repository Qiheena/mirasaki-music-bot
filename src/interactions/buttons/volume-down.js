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
          return interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played`, ephemeral: true });
        }

        const newVolume = Math.max(0, queue.volume - 10);
        queue.volume = newVolume;
        await player.setGlobalVolume(newVolume);
        await interaction.reply({ content: `${ emojis.success } ${ member }, volume decreased to **${ newVolume }%**`, ephemeral: true });
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          return interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played`, ephemeral: true });
        }
        
        const currentVolume = queue.node.volume;
        const newVolume = Math.max(0, currentVolume - 10);
        queue.node.setVolume(newVolume);
        await interaction.reply({ content: `${ emojis.success } ${ member }, volume decreased to **${ newVolume }%**`, ephemeral: true });
      }
    } catch (e) {
      interaction.reply({ content: `${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`, ephemeral: true });
    }
  }
});

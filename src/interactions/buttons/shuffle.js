const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');
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
        
        if (!queue || queue.tracks.length === 0) {
          await interaction.editReply(`${ emojis.error } ${ member }, queue is empty - cannot shuffle`);
          await autoDeleteReply(interaction, 10000);
          return;
        }

        queue.shuffle();
        await interaction.editReply(`${ emojis.success } ${ member }, the queue has been shuffled!`);
        await autoDeleteReply(interaction, 10000);
      } else {
        const queue = useQueue(guild.id);
        
        if (!queue || queue.tracks.data.length === 0) {
          await interaction.editReply(`${ emojis.error } ${ member }, queue is empty - cannot shuffle`);
          await autoDeleteReply(interaction, 10000);
          return;
        }
        
        queue.tracks.shuffle();
        await interaction.editReply(`${ emojis.success } ${ member }, the queue has been shuffled!`);
        await autoDeleteReply(interaction, 10000);
      }
    } catch (e) {
      await interaction.editReply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
      await autoDeleteReply(interaction, 15000);
    }
  }
});

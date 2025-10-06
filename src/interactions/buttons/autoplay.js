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
        const queue = client.queues.get(guild.id);
        
        if (!queue) {
          return interaction.reply(`${ emojis.error } ${ member }, no active music session - this command has been cancelled`);
        }

        queue.autoplay = !queue.autoplay;
        await interaction.reply(`${ emojis.success } ${ member }, autoplay has been **${ queue.autoplay ? 'enabled' : 'disabled' }**`);
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          return interaction.reply(`${ emojis.error } ${ member }, no active music session - this command has been cancelled`);
        }

        queue.setRepeatMode(queue.repeatMode === 3 ? 0 : 3);
        const isEnabled = queue.repeatMode === 3;
        await interaction.reply(`${ emojis.success } ${ member }, autoplay has been **${ isEnabled ? 'enabled' : 'disabled' }**`);
      }
    } catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions, queueEmbedResponse } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: [],
  data: { description: 'Shuffle the current queue' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        if (!queue || queue.tracks.length === 0) {
          return interaction.reply(`${ emojis.error } ${ member }, queue is empty - cannot shuffle`);
        }
        queue.shuffle();
        await interaction.reply(`${ emojis.success } ${ member }, the queue has been shuffled!`);
      } else {
        const queue = useQueue(interaction.guild.id);
        queue.tracks.shuffle();
        queueEmbedResponse(interaction, queue);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

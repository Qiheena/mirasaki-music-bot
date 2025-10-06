const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['restart', 'again'],
  data: { description: 'Replay the current track' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        if (!player || !player.track) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        await player.seekTo(0);
        await interaction.reply(`${ emojis.success } ${ member }, replaying current track!`);
      } else {
        // Rewind to 0:00
        const queue = useQueue(guild.id);
        queue.node.seek(0);
        await interaction.reply(`${ emojis.success } ${ member }, replaying current track!`);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

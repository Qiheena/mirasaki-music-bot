const { useHistory } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['pp', 'back', 'previous'],
  data: { description: 'Play the previous song right away' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        const player = client.players.get(guild.id);
        
        if (!queue || !player) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no active music session - this command has been cancelled` });
          return;
        }

        const prevTrack = queue.playPrevious();
        if (!prevTrack) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no tracks in history - this command has been cancelled` });
          return;
        }

        await player.playTrack({ track: { encoded: prevTrack.track } });
        await interaction.reply({ content: `:arrow_backward: ${ member }, playing previous song: **\`${prevTrack.info.title}\`**` });
      } else {
        const history = useHistory(guild.id);
        if (!history?.previousTrack) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no tracks in history - this command has been cancelled` });
          return;
        }

        await history.previous();
        await interaction.reply({ content: `:arrow_backward: ${ member }, playing previous song` });
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useHistory } = require('discord-player');

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

        const prevTrack = queue.playPrevious();
        if (!prevTrack) {
          return interaction.reply({ content: `${ emojis.error } ${ member }, no previous track in history`, ephemeral: true });
        }

        await player.playTrack({ track: { encoded: prevTrack.track } });
        await interaction.reply({ content: `${ emojis.success } ${ member }, playing previous track: **\`${ prevTrack.info.title }\`**`, ephemeral: true });
      } else {
        const history = useHistory(guild.id);
        if (!history || !history.previousTrack) {
          return interaction.reply({ content: `${ emojis.error } ${ member }, no previous track in history`, ephemeral: true });
        }
        
        await history.previous();
        await interaction.reply({ content: `${ emojis.success } ${ member }, playing previous track`, ephemeral: true });
      }
    } catch (e) {
      interaction.reply({ content: `${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`, ephemeral: true });
    }
  }
});

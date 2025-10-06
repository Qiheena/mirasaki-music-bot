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
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }

        const prevTrack = queue.playPrevious();
        if (!prevTrack) {
          return interaction.reply(`${ emojis.error } ${ member }, no previous track in history`);
        }

        await player.playTrack({ track: { encoded: prevTrack.track } });
        await interaction.reply(`${ emojis.success } ${ member }, playing previous track: **\`${ prevTrack.info.title }\`**`);
      } else {
        const history = useHistory(guild.id);
        if (!history || !history.previousTrack) {
          return interaction.reply(`${ emojis.error } ${ member }, no previous track in history`);
        }
        
        await history.previous();
        await interaction.reply(`${ emojis.success } ${ member }, playing previous track`);
      }
    } catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

const { ComponentCommand } = require('../classes/Commands');
const { requireSessionConditions } = require('../modules/music');
const { usePlayer } = require('discord-player');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        if (!player || !player.track) {
          return interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played`, ephemeral: true });
        }
        await player.setPaused(false);
        await interaction.reply({ content: `${ emojis.success } ${ member }, resumed playback`, ephemeral: true });
      } else {
        const guildPlayerNode = usePlayer(guild.id);
        if (!guildPlayerNode) {
          return interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played`, ephemeral: true });
        }
        guildPlayerNode.setPaused(false);
        await interaction.reply({ content: `${ emojis.success } ${ member }, resumed playback`, ephemeral: true });
      }
    } catch (e) {
      interaction.reply({ content: `${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`, ephemeral: true });
    }
  }
});

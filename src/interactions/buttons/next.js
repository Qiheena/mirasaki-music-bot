const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { usePlayer } = require('discord-player');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        const queue = client.queues.get(guild.id);
        
        if (!player || !player.track || !queue?.current) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        
        const currentTrackTitle = queue.current.info.title;
        await player.stopTrack();
        await interaction.reply(`${ emojis.success } ${ member }, skipped **\`${ currentTrackTitle }\`**`);
      } else {
        const guildPlayerNode = usePlayer(guild.id);
        const currentTrack = guildPlayerNode?.queue?.currentTrack;
        if (!currentTrack) {
          return interaction.reply(`${ emojis.error } ${ member }, no music is currently being played`);
        }
        const success = guildPlayerNode.skip();
        await interaction.reply(success
          ? `${ emojis.success } ${ member }, skipped **\`${ currentTrack.title }\`**`
          : `${ emojis.error } ${ member }, something went wrong - couldn't skip current playing song`);
      }
    } catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

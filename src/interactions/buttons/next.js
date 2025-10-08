const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { usePlayer } = require('discord-player');
const { autoDeleteMessage } = require('../../modules/auto-delete');

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
        
        if (queue.currentMessage) {
          try {
            await queue.currentMessage.delete().catch(() => {});
          } catch (e) {
          }
          queue.currentMessage = null;
        }
        
        await player.stopTrack();
        const reply = await interaction.reply({ content: `${ emojis.success } ${ member }, skipped **\`${ currentTrackTitle }\`**`, fetchReply: true });
        await autoDeleteMessage(reply, 10000);
      } else {
        const guildPlayerNode = usePlayer(guild.id);
        const currentTrack = guildPlayerNode?.queue?.currentTrack;
        if (!currentTrack) {
          const reply = await interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played`, fetchReply: true });
          await autoDeleteMessage(reply, 10000);
          return;
        }
        const success = guildPlayerNode.skip();
        const reply = await interaction.reply({ 
          content: success
            ? `${ emojis.success } ${ member }, skipped **\`${ currentTrack.title }\`**`
            : `${ emojis.error } ${ member }, something went wrong - couldn't skip current playing song`,
          fetchReply: true
        });
        await autoDeleteMessage(reply, 10000);
      }
    } catch (e) {
      const reply = await interaction.reply({ content: `${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`, fetchReply: true });
      await autoDeleteMessage(reply, 15000);
    }
  }
});

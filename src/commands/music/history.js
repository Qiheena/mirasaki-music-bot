const { useHistory } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { queueEmbedResponse, requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: [],
  data: { description: 'Display the current history' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check conditions/state
    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        
        if (!queue || !queue.history || queue.history.length === 0) {
          interaction.reply({ content: `${ emojis.error } ${ member }, history is currently empty. You should totally \`/play\` something - but that's just my opinion.` });
          return;
        }

        const { colorResolver } = require('../../util');
        const { EmbedBuilder } = require('discord.js');
        const { msToTime } = require('../../lavalink-setup');
        
        const historyTracks = queue.history;
        
        const embed = new EmbedBuilder()
          .setColor(colorResolver())
          .setAuthor({
            name: `History for ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
          })
          .setDescription(
            historyTracks.length > 0 
              ? historyTracks.slice(-10).reverse().map((track, i) => `${i + 1}. [${track.info.title}](${track.info.uri}) - ${msToTime(track.info.length)}`).join('\n')
              : 'No history available'
          )
          .setFooter({ text: `${historyTracks.length} track${historyTracks.length !== 1 ? 's' : ''} in history` });
        
        interaction.reply({ embeds: [embed] });
      } else {
        const history = useHistory(guild.id);
        if (!history) {
          interaction.reply({ content: `${ emojis.error } ${ member }, history is currently empty. You should totally \`/play\` something - but that's just my opinion.` });
          return;
        }

        queueEmbedResponse(interaction, history, 'History');
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { queueEmbedResponse, requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: [ 'q', 'list', 'songs' ],
  data: { description: 'Display the current queue' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check conditions/state
    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        
        if (!queue || !queue.current) {
          interaction.reply({ content: `${ emojis.error } ${ member }, queue is currently empty. You should totally \`/play\` something - but that's just my opinion.` });
          return;
        }

        const { colorResolver } = require('../../util');
        const { EmbedBuilder } = require('discord.js');
        const { msToTime } = require('../../lavalink-setup');
        
        const queueTracks = queue.tracks;
        const current = queue.current;
        
        const embed = new EmbedBuilder()
          .setColor(colorResolver())
          .setAuthor({
            name: `Queue for ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
          })
          .setDescription(`**🎵 Now Playing:** [${current.info.title}](${current.info.uri}) - ${msToTime(current.info.length)}\n**Loop Mode:** ${queue.loop}\n\n${
            queueTracks.length > 0 
              ? queueTracks.slice(0, 10).map((track, i) => `${i + 1}. [${track.info.title}](${track.info.uri}) - ${msToTime(track.info.length)}`).join('\n')
              : 'No upcoming tracks'
          }`)
          .setFooter({ text: `${queueTracks.length} track${queueTracks.length !== 1 ? 's' : ''} in queue | Volume: ${queue.volume}%` });
        
        interaction.reply({ embeds: [embed] });
      } else {
        // Check has queue
        const queue = useQueue(guild.id);
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, queue is currently empty. You should totally \`/play\` something - but that's just my opinion.` });
          return;
        }

        // Show queue, interactive
        queueEmbedResponse(interaction, queue);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

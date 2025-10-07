const { ComponentCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');
const { EmbedBuilder } = require('discord.js');
const { colorResolver } = require('../../util');
const { msToTime } = require('../../lavalink-setup');
const { createErrorEmbed } = require('../../modules/embed-utils');

module.exports = new ComponentCommand({
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    await interaction.deferReply({ ephemeral: true });
    
    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        
        if (!queue || !queue.current) {
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, queue is currently empty. You should totally \`/play\` something - but that's just my opinion.`);
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        const queueTracks = queue.tracks;
        const current = queue.current;
        
        const { createInfoEmbed } = require('../../modules/embed-utils');
        const queueInfo = `**🎵 Now Playing:** [${current.info.title}](${current.info.uri}) - ${msToTime(current.info.length)}\n**Loop Mode:** ${queue.loop}\n\n${
          queueTracks.length > 0 
            ? queueTracks.slice(0, 10).map((track, i) => `${i + 1}. [${track.info.title}](${track.info.uri}) - ${msToTime(track.info.length)}`).join('\n')
            : 'No upcoming tracks'
        }`;
        
        const embed = createInfoEmbed(queueInfo)
          .setAuthor({
            name: `Queue for ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
          })
          .setFooter({ text: `${queueTracks.length} track${queueTracks.length !== 1 ? 's' : ''} in queue | Volume: ${queue.volume}%` });
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, queue is currently empty. You should totally \`/play\` something - but that's just my opinion.`);
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray();
        
        const { createInfoEmbed } = require('../../modules/embed-utils');
        const queueInfo = `**🎵 Now Playing:** [${currentTrack.title}](${currentTrack.url}) - ${currentTrack.duration}\n**Repeat Mode:** ${queue.repeatMode}\n\n${
          tracks.length > 0 
            ? tracks.slice(0, 10).map((track, i) => `${i + 1}. [${track.title}](${track.url}) - ${track.duration}`).join('\n')
            : 'No upcoming tracks'
        }`;
        
        const embed = createInfoEmbed(queueInfo)
          .setAuthor({
            name: `Queue for ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true })
          })
          .setFooter({ text: `${tracks.length} track${tracks.length !== 1 ? 's' : ''} in queue | Volume: ${queue.node.volume}%` });
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (e) {
      const errorEmbed = createErrorEmbed(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
      interaction.editReply({ embeds: [errorEmbed] });
    }
  }
});

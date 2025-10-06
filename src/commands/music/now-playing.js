const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { nowPlayingEmbed, requireSessionConditions } = require('../../modules/music');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['np', 'current', 'nowplaying'],
  data: { description: 'Display detailed information on the song that is currently playing' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    // Check conditions/state
    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        const player = client.players.get(guild.id);
        
        if (!queue || !queue.current) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no music is currently being played` });
          return;
        }

        const track = queue.current;
        const { colorResolver } = require('../../util');
        const { EmbedBuilder } = require('discord.js');
        const { msToTime } = require('../../lavalink-setup');
        
        const npEmbed = new EmbedBuilder()
          .setColor(colorResolver())
          .setTitle('🎵 Now Playing')
          .setDescription(`**[${track.info.title}](${track.info.uri})**`)
          .addFields({
            name: 'Details',
            value: `👑 **Author:** ${track.info.author}\n🚩 **Length:** ${msToTime(track.info.length)}\n📖 **Requested by:** ${track.requester.username}`,
            inline: false
          })
          .setThumbnail(track.info.artworkUrl)
          .setFooter({ text: `Volume: ${queue.volume}% | Loop: ${queue.loop}` });
        
        interaction.reply({ embeds: [npEmbed] });
      } else {
        const queue = useQueue(guild.id);
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, queue is currently empty. You should totally \`/play\` something - but that's just my opinion.` });
          return;
        }

        // Ok, display the queue!
        const { currentTrack } = queue;
        if (!currentTrack) {
          interaction.reply(`${ emojis.error } ${ member }, can't fetch information on currently displaying song - please try again later`);
          return;
        }

        const npEmbed = nowPlayingEmbed(queue);
        interaction.reply({ embeds: [ npEmbed ] });
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

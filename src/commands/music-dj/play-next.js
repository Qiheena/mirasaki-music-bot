const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useMainPlayer, useQueue } = require('discord-player');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['pn', 'playnext'],
  data: {
    description: 'Same as /play, but adds it to the front of the queue',
    options: [
      {
        name: 'query',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The music to search/query',
        required: true
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;
    const query = interaction.options.getString('query', true); // we need input/query to play

    // Check state
    if (!requireSessionConditions(interaction, true)) return;

    // Let's defer the interaction as things can take time to process
    await interaction.deferReply();

    try {
      if (process.env.USE_LAVALINK === 'true') {
        const player = client.players?.get(guild.id);
        const queue = client.queues?.get(guild.id);
        
        if (!player || !player.track || !queue) {
          interaction.editReply(`${ emojis.error } ${ member }, no music session is active - this command has been cancelled`);
          return;
        }

        // Search for track using Lavalink
        const node = client.lavalink.nodeMap.get('main');
        const result = await node.rest.resolve(`ytsearch:${query}`);
        
        if (!result?.tracks || result.tracks.length === 0) {
          interaction.editReply(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
          return;
        }

        const firstTrack = result.tracks[0];
        const trackData = {
          track: firstTrack.encoded,
          info: firstTrack.info,
          requester: interaction.user
        };

        // Add to front of queue
        queue.tracks.unshift(trackData);
        interaction.editReply(`${ emojis.success } ${ member }, **\`${ firstTrack.info.title }\`** has been added to the front of the queue`);
      } else {
        const player = useMainPlayer();
        
        // Check is valid
        const searchResult = await player
          .search(query, { requestedBy: interaction.user })
          .catch(() => null);
        if (!searchResult.hasTracks()) {
          interaction.editReply(`${ emojis.error } ${ member }, no tracks found for query \`${ query }\` - this command has been cancelled`);
          return;
        }

        // Ok
        const firstMatchTrack = searchResult.tracks.at(0);
        const queue = useQueue(guild.id);
        queue.addTrack(firstMatchTrack);

        // Swap first and last conditionally
        queue.swapTracks(0, queue.tracks.data.length - 1);
        interaction.editReply(`${ emojis.success } ${ member }, **\`${ firstMatchTrack.title }\`** has been added to the front of the queue`);
      }
    }
    catch (e) {
      interaction.editReply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

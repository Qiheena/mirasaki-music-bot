const { usePlayer } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');

const voteSkipCache = new Map();

module.exports = new ChatInputCommand({
  global: true,
  aliases: [],
  data: { description: 'Vote to skip the currently playing song, requires strict majority to pass' },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { guild, member } = interaction;

    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      if (process.env.USE_LAVALINK === 'true') {
        const player = client.players?.get(guild.id);
        const queue = client.queues?.get(guild.id);
        
        if (!player || !player.track || !queue?.current) {
          interaction.reply(`${ emojis.error } ${ member }, no music is currently being played - this command has been cancelled`);
          return;
        }

        // Get curr track - and update cache
        const currentTrack = queue.current;
        let voteCacheEntry = voteSkipCache.get(guild.id);

        // Initialize
        if (!voteCacheEntry) {
          voteSkipCache.set(guild.id, {
            track: currentTrack.info.uri,
            votes: []
          });
          voteCacheEntry = voteSkipCache.get(guild.id);
        }

        // Reset, different/new track
        else if (voteCacheEntry.track !== currentTrack.info.uri) {
          voteCacheEntry.track = currentTrack.info.uri;
          voteCacheEntry.votes = [];
        }

        // Check has voted
        if (voteCacheEntry.votes.includes(member.id)) {
          interaction.reply(`${ emojis.error } ${ member }, you have already voted - this command has been cancelled`);
          return;
        }
        // Increment votes
        else voteCacheEntry.votes.push(member.id);

        // Resolve threshold
        const channel = member.voice.channel;
        const memberCount = channel.members.size - 1; // - 1 for client
        const threshold = Math.min(memberCount, Math.ceil(memberCount / 2) + 1); // + 1 require strict majority
        if (voteCacheEntry.votes.length < threshold) {
          interaction.reply(`${ emojis.success } ${ member }, registered your vote - current votes: ${ voteCacheEntry.votes.length } / ${ threshold }`);
          return;
        }

        // Skip song, reached threshold - play next track
        if (queue.tracks.length > 0) {
          const nextTrack = queue.tracks.shift();
          queue.current = nextTrack;
          await player.playTrack({ track: { encoded: nextTrack.track } });
          voteSkipCache.delete(guild.id);
          interaction.reply(`${ emojis.success } ${ member }, skipped **\`${ currentTrack.info.title }\`**, vote threshold was reached`);
        } else {
          player.stopTrack();
          queue.current = null;
          voteSkipCache.delete(guild.id);
          interaction.reply(`${ emojis.success } ${ member }, skipped **\`${ currentTrack.info.title }\`**, vote threshold was reached. Queue is now empty.`);
        }
      } else {
        const guildPlayerNode = usePlayer(interaction.guild.id);

        // Get curr track - and update cache
        const currentTrack = guildPlayerNode.queue.currentTrack;
        let voteCacheEntry = voteSkipCache.get(guild.id);

        // Initialize
        if (!voteCacheEntry) {
          voteSkipCache.set(guild.id, {
            track: currentTrack.url,
            votes: []
          });
          voteCacheEntry = voteSkipCache.get(guild.id);
        }

        // Reset, different/new track
        else if (voteCacheEntry.track !== currentTrack.url) {
          voteCacheEntry.track = currentTrack.url;
          voteCacheEntry.votes = [];
        }

        // Check has voted
        if (voteCacheEntry.votes.includes(member.id)) {
          interaction.reply(`${ emojis.error } ${ member }, you have already voted - this command has been cancelled`);
          return;
        }
        // Increment votes
        else voteCacheEntry.votes.push(member.id);

        // Resolve threshold
        const channel = guildPlayerNode.queue.channel;
        const memberCount = channel.members.size - 1; // - 1 for client
        const threshold = Math.min(memberCount, Math.ceil(memberCount / 2) + 1); // + 1 require strict majority
        if (voteCacheEntry.votes.length < threshold) {
          interaction.reply(`${ emojis.success } ${ member }, registered your vote - current votes: ${ voteCacheEntry.votes.length } / ${ threshold }`);
          return;
        }

        // Skip song, reached threshold
        const success = guildPlayerNode.skip();
        if (success) {
          voteSkipCache.delete(guild.id);
          interaction.reply(`${ emojis.success } ${ member }, skipped **\`${ currentTrack.title }\`**, vote threshold was reached`);
        }
        else interaction.reply(`${ emojis.error } ${ member }, something went wrong - couldn't skip current playing song`);
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

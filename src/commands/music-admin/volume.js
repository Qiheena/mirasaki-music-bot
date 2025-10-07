const { usePlayer } = require('discord-player');
const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const {
  getGuildSettings, db, saveDb
} = require('../../modules/db');
const { clientConfig } = require('../../util');

module.exports = new ChatInputCommand({
  global: true,
  permLevel: 'Administrator',
  aliases: ['vol', 'v'],
  data: {
    description: 'Change the playback/player\'s volume',
    options: [
      {
        name: 'volume',
        description: 'The volume level to apply',
        type: ApplicationCommandOptionType.Integer,
        min_value: 1,
        max_value: 100,
        required: false
      }
    ]
  },
  run: async (client, interaction) => {
    const { member, guild } = interaction;
    const volume = interaction.options.getInteger('volume');
    const guilds = db.getCollection('guilds');

    // ✅ Custom emoji (success)
    const successEmoji = '<:emoji_1:1309093521357013022>';

    // Check conditions/state
    if (!requireSessionConditions(interaction, false)) return;

    // Resolve settings
    const settings = getGuildSettings(guild.id);
    if (!volume) {
      await interaction.reply(`${ successEmoji } ${ member }, volume is currently set to **\`${ settings.volume ?? clientConfig.defaultVolume }\`**`);
      return;
    }

    try {
      // Update player volume based on mode
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const player = client.players.get(guild.id);
        if (player && player.track) {
          await player.setGlobalVolume(volume);
        }
        const queue = client.queues.get(guild.id);
        if (queue) queue.volume = volume;
      } else {
        const guildPlayerNode = usePlayer(interaction.guild.id);
        if (guildPlayerNode?.isPlaying()) guildPlayerNode.setVolume(volume);
      }

      // Save volume to database
      settings.volume = volume;
      guilds.update(settings);
      saveDb();

      // ✅ Success feedback
      await interaction.reply({ 
        content: `${ successEmoji } ${ member }, volume set to \`${ volume }\`` 
      });
    }
    catch (e) {
      await interaction.reply(`${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});
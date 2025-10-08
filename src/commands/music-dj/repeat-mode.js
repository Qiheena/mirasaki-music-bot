const { useQueue } = require('discord-player');
const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { repeatModeEmoji, requireSessionConditions } = require('../../modules/music');
const {
  getGuildSettings, db, saveDb
} = require('../../modules/db');

// Helper to get current repeat mode
async function getCurrentRepeatMode(client, guildId) {
  if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
    const queue = client.queues.get(guildId);
    if (!queue) return 0;
    const loopModes = ['off', 'track', 'queue', 'autoplay'];
    return loopModes.indexOf(queue.loop) || 0;
  } else {
    const queue = useQueue(guildId);
    if (!queue) return 0;
    return queue.repeatMode || 0;
  }
}

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['repeat', 'loop'],
  data: {
    description: 'Configure specific repeat-type, or disable repeat altogether',
    options: [
      {
        name: 'mode',
        description: 'The mode to set',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: 'off', value: '0'
          },
          {
            name: 'song', value: '1'
          },
          {
            name: 'queue', value: '2'
          },
          {
            name: 'autoplay', value: '3'
          }
        ]
      },
      {
        name: 'persistent',
        description: 'Save the selected repeat mode. Applies selected repeat mode to new sessions.',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ]
  },
  // eslint-disable-next-line sonarjs/cognitive-complexity
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const {
      guild, member, options
    } = interaction;
    
    // Handle button interactions (no options)
    let repeatMode = 0;
    let shouldSave = false;
    
    if (interaction.isButton()) {
      // For button, cycle through modes: 0 -> 1 -> 2 -> 3 -> 0
      const currentMode = await getCurrentRepeatMode(client, guild.id);
      repeatMode = (currentMode + 1) % 4;
      shouldSave = false;
    } else {
      // For slash/text commands
      repeatMode = Number(options.getString('mode') ?? 0);
      shouldSave = options.getBoolean('persistent') ?? false;
    }

    // Check state
    if (!requireSessionConditions(interaction)) return;

    try {
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no music is being played - initialize a session with \`/play\` first and try again, this command has been cancelled` });
          return;
        }

        // Map repeat modes: 0=off, 1=track, 2=queue, 3=autoplay
        const loopModes = ['off', 'track', 'queue', 'autoplay'];
        queue.loop = loopModes[repeatMode];
        const modeEmoji = repeatModeEmoji(repeatMode);

        // Save for persistency
        if (shouldSave) {
          const guilds = db.getCollection('guilds');
          const settings = await getGuildSettings(guild.id);
          settings.repeatMode = repeatMode;
          await guilds.update(settings);
          await saveDb();
        }

        // Feedback
        interaction.reply({ content: `${ emojis.success } ${ member }, updated repeat mode to: ${ modeEmoji }` });
      } else {
        const queue = useQueue(interaction.guild.id);
        if (!queue) {
          interaction.reply({ content: `${ emojis.error } ${ member }, no music is being played - initialize a session with \`/play\` first and try again, this command has been cancelled` });
          return;
        }

        // Resolve repeat mode
        queue.setRepeatMode(repeatMode);
        const modeEmoji = repeatModeEmoji(repeatMode);

        // Save for persistency
        if (shouldSave) {
          // Perform and notify collection that the document has changed
          const guilds = db.getCollection('guilds');
          const settings = await getGuildSettings(guild.id);
          settings.repeatMode = repeatMode;
          await guilds.update(settings);
          await saveDb();
        }

        // Feedback
        interaction.reply({ content: `${ emojis.success } ${ member }, updated repeat mode to: ${ modeEmoji }` });
      }
    }
    catch (e) {
      interaction.reply(`${ emojis.error } ${ member }, something went wrong:\n\n${ e.message }`);
    }
  }
});

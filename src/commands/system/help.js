const { ChatInputCommand } = require('../../classes/Commands');
const { EmbedBuilder } = require('discord.js');
const { commandAutoCompleteOption } = require('../../interactions/autocomplete/command');
const { colorResolver } = require('../../util');
const { getGuildSettings } = require('../../modules/db');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['h', 'commands', 'cmd'],
  cooldown: {
    type: 'user',
    usages: 2,
    duration: 10
  },
  clientPerms: [ 'EmbedLinks' ],
  data: {
    description: 'Get help and see all available bot commands',
    options: [ commandAutoCompleteOption ]
  },

  run: async (client, interaction) => {
    const { member, guild } = interaction;
    const { commands, emojis } = client.container;
    const settings = getGuildSettings(guild.id);
    const prefix = settings?.prefix || '!';

    const commandName = interaction.options.getString('command');

    if (!commandName) {
      // Simple overview with categorized commands
      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎵 Music Bot Commands')
        .setDescription(`**Quick Start:** Type \`${prefix}play <song name>\` to play music!\nUse \`/help <command>\` to see details about any command.\n\n**Your Prefix:** \`${prefix}\``)
        .addFields(
          {
            name: '🎵 Music Playback',
            value: `\`play\` - Play a song from YouTube, Spotify, SoundCloud\n\`pause\` - Pause the current song\n\`resume\` - Resume playback\n\`skip\` - Skip to next song\n\`stop\` - Stop and clear queue\n\`now-playing\` - Show current playing song`,
            inline: false
          },
          {
            name: '📝 Queue Management',
            value: `\`queue\` - View the music queue\n\`clear-queue\` - Remove all songs from queue\n\`shuffle\` - Shuffle the queue\n\`remove-song\` - Remove a song from queue\n\`move-song\` - Change song position in queue`,
            inline: false
          },
          {
            name: '🎧 Audio Controls',
            value: `\`volume\` - Change playback volume (0-200)\n\`repeat-mode\` - Loop current song or queue\n\`autoplay\` - Auto-play similar songs\n\`audio-filters\` - Add special audio effects`,
            inline: false
          },
          {
            name: '🔍 Search & History',
            value: `\`search\` - Search and choose from results\n\`history\` - View previously played songs\n\`lyrics\` - Display song lyrics`,
            inline: false
          },
          {
            name: '⚙️ Settings',
            value: `\`setprefix\` - Change command prefix\n\`volume\` - Set default volume\n\`dj-roles\` - Set DJ roles for music commands`,
            inline: false
          }
        )
        .setFooter({ text: `💡 Tip: Most commands have shortcuts like ${prefix}p for play` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Show detailed info for specific command
    const cmd = commands.get(commandName);
    if (!cmd) {
      const { createErrorEmbed } = require('../../modules/embed-utils');
      const errorEmbed = createErrorEmbed(`${emojis.error} Command **${commandName}** not found!`);
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const aliases = cmd.aliases && cmd.aliases.length > 0 
      ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ')
      : 'None';

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(`📖 Command: /${cmd.data.name}`)
      .setDescription(cmd.data.description || 'No description available')
      .addFields(
        { name: '📌 Usage', value: `\`/${cmd.data.name}\` or \`${prefix}${cmd.data.name}\``, inline: false },
        { name: '🔗 Shortcuts', value: aliases, inline: false },
        { name: '📁 Category', value: cmd.category || 'General', inline: true }
      )
      .setFooter({ text: `Use ${prefix}help to see all commands` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

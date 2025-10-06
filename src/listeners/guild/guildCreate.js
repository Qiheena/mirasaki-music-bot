const logger = require('@mirasaki/logger');
const chalk = require('chalk');
const { getBotInviteLink, colorResolver } = require('../../util');
const { EmbedBuilder } = require('discord.js');

module.exports = async (client, guild) => {
  // Always check to make sure the guild is available
  if (!guild?.available) return;

  // Logging the event to our console
  logger.success(`${ chalk.greenBright('[GUILD JOIN]') } ${ guild.name } has added the bot! Members: ${ guild.memberCount }`);

  // Try to find who added the bot and send them a thank you DM
  try {
    // Fetch audit logs to find who added the bot
    const auditLogs = await guild.fetchAuditLogs({
      type: 28, // BOT_ADD
      limit: 1
    });

    const botAddLog = auditLogs.entries.first();
    
    if (botAddLog && botAddLog.executor) {
      const inviter = botAddLog.executor;
      
      // Create thank you embed
      const thankYouEmbed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎉 Thank You for Adding Me!')
        .setDescription([
          `Hey **${inviter.username}**! Thank you so much for adding me to **${guild.name}**! ❤️`,
          '',
          '**I\'m a powerful music bot with:**',
          '🎵 Ultra-fast Lavalink streaming',
          '🎮 Interactive music controls with buttons',
          '🎨 Beautiful pink-themed messages',
          '🔊 High-quality audio playback',
          '📜 Queue management and history',
          '🎛️ Audio filters and equalizers',
          '',
          '**Get Started:**',
          '• Use `/play <song>` to start playing music',
          '• Use `/help` to see all commands',
          '• Use `/setprefix` to change the prefix (default: `!`)',
          '',
          '**Support & Invite:**'
        ].join('\n'))
        .addFields(
          {
            name: '🔗 Invite Link',
            value: `[Click here to invite me to another server](${getBotInviteLink(client)})`,
            inline: false
          },
          {
            name: '💝 Made with Love',
            value: '❤️ Created by @RasaVedic with love for music lovers!',
            inline: false
          }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Enjoy the music! • Server: ${guild.name}` })
        .setTimestamp();

      // Try to send DM to the inviter
      await inviter.send({ embeds: [thankYouEmbed] });
      logger.success(`${chalk.greenBright('[GUILD JOIN]')} Sent thank you DM to ${inviter.tag}`);
    }
  } catch (error) {
    // Silently fail if we can't send DM (user has DMs disabled, missing permissions, etc.)
    if (error.code === 50007) {
      logger.debug(`${chalk.yellowBright('[GUILD JOIN]')} Could not send DM to inviter (DMs disabled)`);
    } else if (error.code === 50013) {
      logger.debug(`${chalk.yellowBright('[GUILD JOIN]')} Missing permissions to fetch audit logs`);
    } else {
      logger.debug(`${chalk.yellowBright('[GUILD JOIN]')} Could not send thank you DM: ${error.message}`);
    }
  }
};

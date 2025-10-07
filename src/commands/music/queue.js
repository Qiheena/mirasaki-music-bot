const { useQueue } = require('discord-player');
const { ChatInputCommand } = require('../../classes/Commands');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { queueEmbedResponse, requireSessionConditions } = require('../../modules/music');
const { msToTime } = require('../../lavalink-setup');
const { colorResolver } = require('../../util');

module.exports = new ChatInputCommand({
  global: true,
  aliases: ['q', 'list'],
  data: { description: 'Display the current queue with pagination' },

  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;

    if (!requireSessionConditions(interaction, true, false, false)) return;

    try {
      // === LAVALINK MODE ===
      if (process.env.USE_LAVALINK === 'true' && client.lavalink) {
        const queue = client.queues.get(guild.id);
        if (!queue || !queue.current) {
          return interaction.reply({
            content: `${emojis.error} ${member}, queue is empty. Try \`/play\` something.`,
            ephemeral: true
          });
        }

        const tracks = queue.tracks;
        const tracksPerPage = 10;
        const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
        let currentPage = 0;

        const generateEmbed = (page) => {
          const start = page * tracksPerPage;
          const end = start + tracksPerPage;
          const queuePage = tracks.slice(start, end);

          return new EmbedBuilder()
            .setColor(colorResolver())
            .setAuthor({
              name: `Queue for ${guild.name}`,
              iconURL: guild.iconURL({ dynamic: true })
            })
            .setDescription(
              `**🎵 Now Playing:** [${queue.current.info.title}](${queue.current.info.uri}) - ${msToTime(queue.current.info.length)}\n\n` +
              (queuePage.length
                ? queuePage
                    .map((track, i) =>
                      `${start + i + 1}. [${track.info.title}](${track.info.uri}) - ${msToTime(track.info.length)}`
                    )
                    .join('\n')
                : 'No more tracks')
            )
            .setFooter({
              text: `Page ${page + 1} / ${totalPages} | Loop: ${queue.loop} | Volume: ${queue.volume}%`
            });
        };

        const buttons = (page) =>
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prevPage')
              .setLabel('⏮️ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('nextPage')
              .setLabel('Next ⏭️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1)
          );

        const message = await interaction.reply({
          embeds: [generateEmbed(currentPage)],
          components: [buttons(currentPage)],
          fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 60_000
        });

        collector.on('collect', async (btn) => {
          if (btn.customId === 'nextPage') currentPage++;
          else if (btn.customId === 'prevPage') currentPage--;
          await btn.update({
            embeds: [generateEmbed(currentPage)],
            components: [buttons(currentPage)]
          });
        });

        collector.on('end', async () => {
          await message.edit({ components: [] }).catch(() => {});
        });
      }

      // === DISCORD PLAYER MODE ===
      else {
        const queue = useQueue(guild.id);
        if (!queue || !queue.current) {
          return interaction.reply({
            content: `${emojis.error} ${member}, queue is empty. Try \`/play\` something.`,
            ephemeral: true
          });
        }

        const tracks = queue.tracks.toArray();
        const tracksPerPage = 10;
        const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
        let currentPage = 0;

        const generateEmbed = (page) => {
          const start = page * tracksPerPage;
          const end = start + tracksPerPage;
          const queuePage = tracks.slice(start, end);

          return new EmbedBuilder()
            .setColor('Blurple')
            .setAuthor({
              name: `Queue for ${guild.name}`,
              iconURL: guild.iconURL({ dynamic: true })
            })
            .setDescription(
              `**🎵 Now Playing:** [${queue.currentTrack.title}](${queue.currentTrack.url})\n\n` +
              (queuePage.length
                ? queuePage
                    .map((track, i) =>
                      `${start + i + 1}. [${track.title}](${track.url}) - ${msToTime(track.durationMS)}`
                    )
                    .join('\n')
                : 'No more tracks')
            )
            .setFooter({
              text: `Page ${page + 1} / ${totalPages} | Volume: ${queue.node.volume}%`
            });
        };

        const buttons = (page) =>
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prevPage')
              .setLabel('⏮️ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('nextPage')
              .setLabel('Next ⏭️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1)
          );

        const message = await interaction.reply({
          embeds: [generateEmbed(currentPage)],
          components: [buttons(currentPage)],
          fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 60_000
        });

        collector.on('collect', async (btn) => {
          if (btn.customId === 'nextPage') currentPage++;
          else if (btn.customId === 'prevPage') currentPage--;
          await btn.update({
            embeds: [generateEmbed(currentPage)],
            components: [buttons(currentPage)]
          });
        });

        collector.on('end', async () => {
          await message.edit({ components: [] }).catch(() => {});
        });
      }
    } catch (e) {
      console.error(e);
      return interaction.reply({
        content: `${emojis.error} ${member}, something went wrong:\n\n${e.message}`,
        ephemeral: true
      });
    }
  }
});
const os = require('os');
const { ChatInputCommand } = require('../../classes/Commands');
const { stripIndents } = require('common-tags');
const { version } = require('discord.js');
const { BYTES_IN_KIB } = require('../../constants');
const { colorResolver, msToHumanReadableTime } = require('../../util');

const discordVersion = version.indexOf('dev') < 0 ? version : version.slice(0, version.indexOf('dev') + 3);
const discordVersionDocLink = `https://discord.js.org/#/docs/discord.js/v${discordVersion.split('.')[0]}/general/welcome`;
const nodeVersionDocLink = `https://nodejs.org/docs/latest-${process.version.split('.')[0]}.x/api/#`;

module.exports = new ChatInputCommand({
  global: true,
  cooldown: { type: 'channel', usages: 1, duration: 30 },
  clientPerms: ['EmbedLinks'],
  aliases: ['status', 'info', 'st', 'ping', 'stats'],
  data: { description: 'Displays detailed bot & system stats' },

  run: async (client, interaction) => {
    const { emojis } = client.container;

    // Ping Calculations - More accurate method
    const latency = Math.round(client.ws.ping);
    const startTime = Date.now();
    const response = await interaction.reply({ content: '📡 Checking ping...', fetchReply: true });
    const fullLatency = Date.now() - startTime;

    // Function for latency emoji and visual indicator
    const getLatencyEmoji = (ms) => {
      if (ms <= 100) return '🟢';
      if (ms <= 250) return '🟡';
      if (ms <= 500) return '🟠';
      return '🔴';
    };

    const getLatencyBar = (ms) => {
      const bars = 10;
      const filled = Math.min(Math.floor(ms / 100), bars);
      return '█'.repeat(filled) + '░'.repeat(bars - filled);
    };

    // Memory + CPU info - More detailed
    const memory = process.memoryUsage();
    const usedMB = (memory.heapUsed / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const totalMB = (os.totalmem() / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const freeMB = (os.freemem() / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const memoryUsagePercent = ((memory.heapUsed / os.totalmem()) * 100).toFixed(1);
    
    // CPU Load - More accurate
    const cpuLoad = os.loadavg();
    const cpuCores = os.cpus().length;
    const cpuUsagePercent = ((cpuLoad[0] / cpuCores) * 100).toFixed(1);

    // Uptime
    const uptime = msToHumanReadableTime(Date.now() - client.readyTimestamp);
    const systemUptime = msToHumanReadableTime(os.uptime() * 1000);

    // User & Server stats
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const totalGuilds = client.guilds.cache.size;
    const totalChannels = client.channels.cache.size;
    const totalEmojis = client.emojis.cache.size;
    const totalCommands = client.commands?.size ?? 0;

    // Platform + Host info
    const platform = os.type();
    const arch = os.arch();
    const node = process.version;
    const hostname = os.hostname();

    // Memory usage visualization
    const getMemoryBar = (used, total) => {
      const percentage = (used / total) * 100;
      const bars = 10;
      const filled = Math.min(Math.floor(percentage / 10), bars);
      return '█'.repeat(filled) + '░'.repeat(bars - filled);
    };

    // Create visual ping circle
    const getPingCircle = (ms) => {
      const max = 500; // Max ping for full circle
      const segments = 8;
      const filled = Math.min(Math.floor((ms / max) * segments), segments);
      return '●'.repeat(filled) + '○'.repeat(segments - filled);
    };

    // Main Embed
    await interaction.editReply({
      content: '',
      embeds: [
        {
          color: colorResolver(),
          author: {
            name: `${client.user.username} System Stats`,
            iconURL: client.user.displayAvatarURL()
          },
          description: stripIndents`
            **📊 Real-time Performance**
            ${getPingCircle(latency)} **Ping Status**

            **🌐 Network Latency**
            ${getLatencyBar(latency)} ${getLatencyEmoji(latency)} **API:** ${latency}ms
            ${getLatencyBar(fullLatency)} ⏱️ **Full:** ${fullLatency}ms

            **⏰ Uptime**
            🕒 **Bot:** ${uptime}
            💻 **System:** ${systemUptime}
          `,
          fields: [
            {
              name: '💾 Memory Usage',
              value: stripIndents`
                ${getMemoryBar(memory.heapUsed, os.totalmem())} **${memoryUsagePercent}%**
                **Used:** ${usedMB}MB / ${totalMB}MB
                **Free:** ${freeMB}MB
              `,
              inline: true
            },
            {
              name: '⚡ CPU Performance',
              value: stripIndents`
                **Load (1/5/15min):** ${cpuLoad[0]}/${cpuLoad[1]}/${cpuLoad[2]}
                **Usage:** ${cpuUsagePercent}%
                **Cores:** ${cpuCores}
              `,
              inline: true
            },
            {
              name: '🌍 System Information',
              value: stripIndents`
                **Platform:** ${platform} ${arch}
                **Host:** ${hostname}
                **Node.js:** [${node}](${nodeVersionDocLink})
                **Discord.js:** [v${discordVersion}](${discordVersionDocLink})
              `,
              inline: false
            },
            {
              name: '📊 Discord Statistics',
              value: stripIndents`
                **🏠 Servers:** ${totalGuilds.toLocaleString('en-US')}
                **💬 Channels:** ${totalChannels.toLocaleString('en-US')}
                **👥 Users:** ${totalUsers.toLocaleString('en-US')}
              `,
              inline: true
            },
            {
              name: '📦 Cached Data',
              value: stripIndents`
                **🎭 Emojis:** ${totalEmojis.toLocaleString('en-US')}
                **⚙️ Commands:** ${totalCommands.toLocaleString('en-US')}
                **👤 Users:** ${client.users.cache.size.toLocaleString('en-US')}
              `,
              inline: true
            },
            {
              name: '📈 Performance Metrics',
              value: stripIndents`
                **Shard:** ${interaction.guild?.shardId ?? 0}/${client.ws.shards.size}
                **WS Events/sec:** ${client.ws.ping ? 'Active' : 'N/A'}
                **Voice Connections:** ${client.voice?.adapters?.size || 0}
              `,
              inline: false
            }
          ],
          footer: {
            text: `Made with ❤️ by RasaVedic#0001 ${emojis.separator || '•'} ${new Date().toLocaleDateString()}`
          },
          timestamp: new Date(),
          thumbnail: {
            url: client.user.displayAvatarURL()
          }
        }
      ]
    });
  }
});
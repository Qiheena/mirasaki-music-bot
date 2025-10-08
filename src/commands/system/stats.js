//Code By @RasaVedic

const os = require('os');
const { ChatInputCommand } = require('../../classes/Commands');
const { stripIndents } = require('common-tags');
const { version } = require('discord.js');
const { BYTES_IN_KIB } = require('../../constants');
const { colorResolver, msToHumanReadableTime } = require('../../util');

// --- Helper constants for documentation links ---
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
    // --- ओनर चेक ---
    // This checks if the user running the command is the bot owner
    // Make sure to set OWNER_ID in your .env file
    const isOwner = interaction.user.id === process.env.OWNER_ID;

    const { emojis } = client.container;

    // --- पिंग गणना ---
    const latency = Math.round(client.ws.ping);
    const startTime = Date.now();
    const response = await interaction.reply({
      content: '📡 Checking ping and gathering system information...',
      fetchReply: true
    });
    const fullLatency = Date.now() - startTime;

    // --- Helper Functions for Visuals ---
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

    const getMemoryBar = (used, total) => {
      const percentage = (used / total) * 100;
      const bars = 10;
      const filled = Math.min(Math.floor(percentage / 10), bars);
      return '█'.repeat(filled) + '░'.repeat(bars - filled);
    };

    const getPingCircle = (ms) => {
      const max = 500; // Max ping for full circle
      const segments = 8;
      const filled = Math.min(Math.floor((ms / max) * segments), segments);
      return '●'.repeat(filled) + '○'.repeat(segments - filled);
    };

    // --- सिस्टम की जानकारी ---
    const memory = process.memoryUsage();
    const usedMB = (memory.heapUsed / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const totalMB = (os.totalmem() / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const freeMB = (os.freemem() / BYTES_IN_KIB / BYTES_IN_KIB).toFixed(2);
    const memoryUsagePercent = ((memory.heapUsed / os.totalmem()) * 100).toFixed(1);

    const cpuLoad = os.loadavg();
    const cpuCores = os.cpus().length;
    const cpuUsagePercent = ((cpuLoad[0] / cpuCores) * 100).toFixed(1);

    const uptime = msToHumanReadableTime(Date.now() - client.readyTimestamp);
    const systemUptime = msToHumanReadableTime(os.uptime() * 1000);

    // --- डिस्कॉर्ड आँकड़े ---
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const totalGuilds = client.guilds.cache.size;
    const totalChannels = client.channels.cache.size;
    const totalEmojis = client.emojis.cache.size;
    const totalCommands = client.commands?.size ?? 0;

    // --- संवेदनशील जानकारी ---
    // Only show private data to the owner
    const platform = os.type();
    const arch = os.arch();
    const node = process.version;
    const hostname = isOwner ? os.hostname() : '[REDACTED]';
    const internalIP = isOwner
      ? (Object.values(os.networkInterfaces())
        .flat()
        .find(iface => iface.family === 'IPv4' && iface.internal)?.address || 'Not Available')
      : '[REDACTED]';

    const hostingInfo = getDetailedHostingInfo(platform, hostname, isOwner);
    const nodeStats = getNodeStats(isOwner);

    // --- Hosting Detection Function ---
    function getDetailedHostingInfo(platform, hostname, isOwner) {
      // Basic info available to everyone
      let info = {
        provider: 'Unknown Hosting Provider',
        location: '[REDACTED]',
        type: 'Unknown',
        features: [],
        region: '[REDACTED]'
      };
      
      // Detection logic...
      if (process.env.RENDER) info.provider = 'Render Cloud Services';
      else if (process.env.HEROKU_APP_NAME) info.provider = 'Heroku';
      else if (hostname.includes('aws')) info.provider = 'Amazon Web Services (AWS)';
      else if (hostname.includes('localhost')) info.provider = 'Local Development';
      else if (platform.includes('Linux')) info.provider = 'Linux Server';

      // Detailed info only for the owner
      if (isOwner) {
        info.location = 'Owner Only'; // Replace with actual logic if needed
        info.region = process.env.RENDER_REGION || 'Owner Only';
      }

      return info;
    }
    
    // --- Node.js Process Stats Function ---
    function getNodeStats(isOwner) {
        const commonStats = {
            uptime: process.uptime(),
            version: process.version,
            versions: process.versions,
        };

        if (isOwner) {
            return {
                ...commonStats,
                pid: process.pid,
                ppid: process.ppid,
                memory: {
                    rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
                    heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
                    heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                },
                cpuUsage: process.cpuUsage ? {
                    user: (process.cpuUsage().user / 1000000).toFixed(2),
                    system: (process.cpuUsage().system / 1000000).toFixed(2)
                } : null
            };
        } else {
            return {
                ...commonStats,
                pid: '[REDACTED]',
                ppid: '[REDACTED]',
                memory: { rss: '[REDACTED]' },
                cpuUsage: null
            };
        }
    }

    // --- मुख्य एम्बेड ---
    await interaction.editReply({
      content: '',
      embeds: [
        {
          color: colorResolver(),
          author: {
            name: `${client.user.username} • System Statistics`,
            iconURL: client.user.displayAvatarURL()
          },
          description: stripIndents`
            ${!isOwner ? `🔒 Some system information is redacted for privacy. Full details are only available to the bot owner (@RasaVedic).\n` : ''}
            **📊 Real-time Performance Metrics**
            ${getPingCircle(latency)} **Live Ping Status**

            **🌐 Network Latency**
            ${getLatencyBar(latency)} ${getLatencyEmoji(latency)} **API Latency:** ${latency}ms
            ${getLatencyBar(fullLatency)} ⏱️ **Full Round-Trip:** ${fullLatency}ms

            **⏰ System Uptime**
            🤖 **Bot Uptime:** ${uptime}
            💻 **System Uptime:** ${systemUptime}
          `,
          fields: [
            {
              name: '💾 Memory Usage',
              value: stripIndents`
                ${getMemoryBar(memory.heapUsed, os.totalmem())} **${memoryUsagePercent}%**
                **Usage:** ${usedMB}MB / ${totalMB}MB
                **Free:** ${freeMB}MB
              `,
              inline: true
            },
            {
              name: '⚡ CPU Performance',
              value: stripIndents`
                **Load:** ${cpuLoad[0].toFixed(2)}
                **Usage:** ${cpuUsagePercent}%
                **Cores:** ${cpuCores}
              `,
              inline: true
            },
            {
              name: '🏢 Hosting Environment',
              value: stripIndents`
                **Provider:** ${hostingInfo.provider}
                **Platform:** ${platform} ${arch}
                **Hostname:** ${hostname}
                **Internal IP:** ${internalIP}
              `,
              inline: false
            },
            {
              name: '📦 Node.js Process',
              value: stripIndents`
                **Process ID:** ${nodeStats.pid}
                **Uptime:** ${msToHumanReadableTime(nodeStats.uptime * 1000)}
                **Memory (RSS):** ${nodeStats.memory.rss}MB
                **Node.js:** [${node}](${nodeVersionDocLink})
              `,
              inline: true
            },
            {
              name: '📊 Discord Stats',
              value: stripIndents`
                **Servers:** ${totalGuilds.toLocaleString('en-US')}
                **Users:** ${totalUsers.toLocaleString('en-US')}
                **Channels:** ${totalChannels.toLocaleString('en-US')}
                **Commands:** ${totalCommands.toLocaleString('en-US')}
              `,
              inline: true
            },
            {
              name: '🔧 Technical Specs',
              value: stripIndents`
                **Discord.js:** [v${discordVersion}](${discordVersionDocLink})
                **Shard ID:** ${interaction.guild?.shardId ?? 0}/${client.ws.shards.size}
                **Voice Connections:** ${client.voice?.adapters?.size || 0}
              `,
              inline: false
            }
          ],
          footer: {
            text: `🚀 This message will auto-delete in 30 seconds • Made by RasaVedic#0001 ${emojis.separator || '•'} ${new Date().toLocaleDateString()}`
          },
          timestamp: new Date(),
          thumbnail: {
            url: client.user.displayAvatarURL()
          }
        }
      ]
    });

    // --- संदेश को स्वतः हटाएं ---
    setTimeout(async () => {
      try {
        await response.delete();
      } catch (error) {
        console.log('Could not delete status message:', error.message);
      }
    }, 30000); // 30 seconds
  }
});
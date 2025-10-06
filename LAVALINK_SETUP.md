# Lavalink Configuration

This Discord bot now uses **Lavalink** for high-performance audio streaming instead of the default discord-player extractors.

## Current Configuration

The bot is configured to use a free public Lavalink server:
- **Host**: `lava-v4.ajieblogs.eu.org`
- **Port**: `80`
- **Password**: `https://dsc.gg/ajidevserver`
- **Version**: Lavalink v4

## How It Works

1. **Lavalink** is a standalone audio server that handles all the audio processing
2. Your Discord bot connects to Lavalink via WebSocket
3. Audio streaming is offloaded to Lavalink, making your bot more efficient
4. Supports multiple sources: SoundCloud, Apple Music, Vimeo, ReverbNation, and more

## Environment Variables

The following environment variables control Lavalink:

```env
USE_LAVALINK=true                              # Enable/disable Lavalink
LAVALINK_HOST=lava-v4.ajieblogs.eu.org        # Lavalink server hostname
LAVALINK_PORT=80                               # Lavalink server port
LAVALINK_PASSWORD=https://dsc.gg/ajidevserver # Lavalink password
LAVALINK_SECURE=false                          # Use SSL (wss://) or not (ws://)
LAVALINK_NODE_ID=main-node                     # Node identifier
```

## Alternative Public Lavalink Servers

If the current server is down, you can use these alternatives:

### Option 1: NextGen Coders
```env
LAVALINK_HOST=lavalink.nextgencoders.xyz
LAVALINK_PORT=80
LAVALINK_PASSWORD=nextgencoderspvt
```

### Option 2: Catfein (Singapore)
```env
LAVALINK_HOST=lava-sg.catfein.co.id
LAVALINK_PORT=5000
LAVALINK_PASSWORD=catfein
```

### Option 3: Catfein (US)
```env
LAVALINK_HOST=lava-us.catfein.co.id
LAVALINK_PORT=5000
LAVALINK_PASSWORD=catfein
```

## Switching Back to discord-player

To use the default discord-player instead of Lavalink:

1. Set `USE_LAVALINK=false` in your `.env` file
2. Restart the bot

## Features

- ✅ High performance audio streaming
- ✅ Multiple music sources supported
- ✅ Automatic reconnection on disconnects
- ✅ Queue management
- ✅ Volume control
- ✅ Audio filters and effects

## Important Note

⚠️ **The existing music commands in this bot are designed for discord-player, not Lavalink.** 

While Lavalink is integrated and running, the current `/play` and other music commands will need to be updated to use Lavalink's API instead of discord-player's API. This integration provides the foundation, but command logic needs to be adapted.

For now, you can:
1. Keep `USE_LAVALINK=false` to use the existing discord-player commands
2. Or modify the music commands to use `client.lavalink` instead of the `player` instance

## Troubleshooting

**Issue: "NoExtractors" warning**
- This is expected when Lavalink is enabled - Lavalink has its own extractors
- The existing commands still try to use discord-player extractors
- Commands need to be updated to use Lavalink's player API

**Issue: Bot not connecting to Lavalink**
- Check if the Lavalink server is online
- Try a different public server from the list above
- Verify your environment variables are correct

**Issue: No audio playing**
- Make sure the bot has proper Discord permissions
- Check if the Lavalink node is connected (look for "Lavalink node connected" in logs)
- Try a different audio source

## Support

For Lavalink-specific issues, join the Lavalink Discord server: https://discord.gg/lavalink-1082302532421943407

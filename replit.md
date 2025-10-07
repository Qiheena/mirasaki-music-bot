# RasaVedic Music Bot

## Overview
RasaVedic is a Discord music bot built with discord.js and discord-player, designed to provide high-quality audio streaming. It integrates with Lavalink for efficient audio processing and supports various sources including SoundCloud, Apple Music, Vimeo, and ReverbNation. The bot features a command-based architecture with role-based permissions, persistent guild settings, advanced playback controls like audio filters and equalizers, and comprehensive queue management. The project aims to offer a smooth, reliable, and feature-rich music experience on Discord.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### Major Bot Improvements & Bug Fixes

#### Connection & Performance Enhancements
- **Faster reconnection**: Reduced retry interval from 5s to 2s for quicker recovery
- **More reliable**: Increased retry attempts from 15 to 25 with smart backoff
- **Auto-recovery**: Bot automatically restores playback after Lavalink disconnects
- **Optimized caching**: Extended cache time to 10 minutes for better performance
- **Improved timeouts**: Extended connection and REST timeouts for stability

#### Button & Command Fixes
- **Loop button fixed**: Added proper deferReply to prevent interaction errors
- **Queue button fixed**: Now responds correctly with enhanced metadata display
- **Sleep command enhanced**: Added hours (h), minutes (m), and seconds (s) options
- **All buttons optimized**: Faster response with ephemeral replies

#### Enhanced Metadata & Display
- **Rich track info**: Now shows Artist (🎤), Duration (⏱️), Source (📡), and Requester (👤)
- **Live stream detection**: Shows 🔴 LIVE indicator for streaming content
- **Source display**: Shows music source (YOUTUBE, SOUNDCLOUD, etc.)
- **Better formatting**: All messages use proper embeds with color coding

#### Message Formatting System
- **Color-coded messages**: Green (success ✅), Red (errors ❌), Pink (info)
- **Embed utility module**: Consistent, beautiful message formatting throughout
- **Error messages**: Clear, properly formatted error displays with red color
- **Success messages**: Green embeds for all successful operations

#### Search Accuracy Improvements
- **Smart search detection**: Auto-detects SoundCloud, Spotify, YouTube queries
- **Better results**: Uses appropriate search prefix for accurate matches
- **Improved queries**: Optimized search strings for better track finding

#### Help Command Enhancements
- **Navigation buttons**: Added Previous (◀️), Home (🏠), Next (▶️) buttons
- **Better UX**: Cleaner interface with proper pagination
- **Organized commands**: Commands grouped and easy to browse

#### Queue & Playback Improvements
- **Retry mechanism**: Tracks retry up to 3 times if playback fails
- **Auto-skip on failure**: Automatically skips to next track after max retries
- **Better stuck handling**: Improved recovery when player gets stuck
- **Enhanced cleanup**: Proper cleanup of listeners and resources on disconnect

#### Voice Activity Monitoring
- **Faster checks**: Reduced monitoring interval from 30s to 15s
- **Better error handling**: Catches and logs voice channel errors properly
- **Clean disconnection**: Removes all listeners before cleanup

## System Architecture

### Core Framework
- **Discord.js v14**: For Discord API interaction.
- **Discord-player v6**: Handles audio playback, track extraction, queuing, and streaming.
- **Node.js**: Runtime environment (versions 20.x-23.x).

### Audio Streaming Architecture
- **Lavalink Integration**: Primary audio server using WebSocket-based connection to Lavalink v4 nodes, offloading audio processing for performance and scalability.
- **Dual-Mode Support**: Bot supports both Discord-player's direct streaming and Lavalink for audio.
- **Optimized Lavalink Configuration**: Features 100ms position tracking, 60-second cleanup, `useUnresolvedData` for instant track loading, and 10 retry attempts for connection reliability.

### Command System
- **Class-based Architecture**: Extensible command handling with `ChatInputCommand` base class.
- **Features**: Slash commands, auto-complete for music queries, multi-tier permission system, and command cooldowns.
- **Dynamic Loading**: Commands are loaded dynamically from the file system.

### Permission System
- **Multi-tier access control**:
    - User (default)
    - Moderator (configurable DJ roles)
    - Administrator (Discord admin permission)
    - Server Owner
    - Developer (configurable user IDs)
    - Bot Owner

### Data Persistence
- **LokiJS**: In-memory database with file system persistence for guild-specific settings (e.g., volume, repeat mode, DJ roles, audio filters).
- **Auto-save**: Hourly auto-save with auto-load on startup.

### Music Session Management
- **Thread-based Isolation**: Manages playback state and user interaction with optional dedicated threads per music session.
- **Event-driven updates**: Queue updates triggered by player events.

### Audio Processing
- **FFmpeg-based Filters**: Utilizes FFmpeg for advanced audio manipulation, including biquad filters, equalizer presets, and custom audio filter chains.
- **Persistent Configurations**: Filter settings are saved per guild.

### Vote System
- **In-memory vote tracking**: For democratic skip control, requiring >50% of voice channel members (excluding the bot) to skip a track.

### Configuration Management
- **Environment-based**: Uses `.env` for sensitive credentials and `config.js` for feature defaults.
- **Runtime Mode Detection**: Supports production, development, and test environments.

## External Dependencies

### Audio Services
- **Lavalink**: Standalone audio server (default: `lava-v4.ajieblogs.eu.org:80`).
- **SoundCloud**: Music source via @discord-player/extractor.
- **Apple Music**: Music source via @discord-player/extractor.
- **Vimeo**: Video/audio source.
- **ReverbNation**: Music platform integration.

### Discord API
- **Discord.js**: Discord API library.
- **@discordjs/rest**: REST API client for slash commands.
- **Discord Gateway**: WebSocket connection for real-time events.
- **Application Commands API**: For slash command registration.

### Development Tools
- **ESLint**: Code quality and style enforcement.
- **Nodemon**: For development auto-reload.

### Deployment Options
- **Docker**: Containerized deployment with FFmpeg pre-installed.
- **PM2**: Process management for Node.js applications.
- **Replit**: Cloud-based hosting compatibility.
- **Render**: Fully compatible with Render deployment
  - Procfile configured for background worker deployment
  - Node.js version: 20.x (compatible with Render)
  - All production dependencies included
  - Required environment variables: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, OWNER_ID, NODE_ENV=production
  - Optional: Lavalink configuration (USE_LAVALINK, LAVALINK_HOST, LAVALINK_PORT, LAVALINK_PASSWORD)
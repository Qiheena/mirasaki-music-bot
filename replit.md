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

#### Enhanced Metadata & Display (October 2025)
- **Rich track info**: Now shows Artist (🎤), Duration (⏱️), Source (📡), and Requester (👤)
- **Live stream detection**: Shows 🔴 LIVE indicator for streaming content
- **Source display**: Shows music source (YOUTUBE, SOUNDCLOUD, etc.)
- **Better formatting**: All messages use proper embeds with color coding
- **Consistent timestamps**: All now-playing messages show when the track started
- **Fixed embed serialization**: Corrected malformed Discord embed structures

#### Message Formatting System
- **Color-coded messages**: Green (success ✅), Red (errors ❌), Pink (info)
- **Embed utility module**: Consistent, beautiful message formatting throughout
- **Error messages**: Clear, properly formatted error displays with red color
- **Success messages**: Green embeds for all successful operations

#### Search Accuracy Improvements (October 2025)
- **Smart search detection**: Auto-detects SoundCloud, Spotify, YouTube queries
- **Better results**: Uses appropriate search prefix for accurate matches
- **Improved queries**: Optimized search strings for better track finding
- **Fixed query parsing bug**: Bot now searches full queries (e.g., "shape of you") instead of just first word ("shape")
- **Multiple word support**: Properly handles song names with spaces in all command contexts

#### Help Command Enhancements (October 2025)
- **Completely simplified**: Removed complex pagination and select menus for cleaner interface
- **Categorized commands**: Music Playback, Queue Management, Audio Controls, Search & History, Settings
- **Better explanations**: Each command has clear, simple descriptions
- **Quick start guide**: Shows users how to get started immediately
- **User-friendly**: Shows prefix and command shortcuts at a glance

#### Queue & Playback Improvements
- **Retry mechanism**: Tracks retry up to 3 times if playback fails
- **Auto-skip on failure**: Automatically skips to next track after max retries
- **Better stuck handling**: Improved recovery when player gets stuck
- **Enhanced cleanup**: Proper cleanup of listeners and resources on disconnect

#### Voice Activity Monitoring
- **Faster checks**: Reduced monitoring interval from 30s to 15s
- **Better error handling**: Catches and logs voice channel errors properly
- **Clean disconnection**: Removes all listeners before cleanup

#### Queue & Button Enhancements (October 2025)
- **Shuffle button added**: New shuffle button on music controls for easy queue randomization
- **Improved autoplay**: Now plays truly related songs by searching artist catalog instead of same song from different uploaders
- **Smart song selection**: Autoplay picks random tracks from top 5 artist songs, excluding duplicates
- **Message auto-delete**: Bot responses now auto-delete after 10-15 seconds to keep chat clean
- **Clean chat system**: All button interactions and command responses are automatically cleaned up
- **Loop functionality verified**: Loop modes (track/queue/off) work correctly with proper state management
- **Metadata display fixed**: Provisional "Added To Queue" message now properly deleted to show clean metadata

#### Latest Critical Fixes (October 08, 2025)
- **Loop/Repeat Bug Fixed**: Autoplay mode (mode 3) now correctly displays and functions instead of showing as 'off'
- **Auto-delete Messages**: Now playing messages auto-delete based on guild settings (configurable via `/set-autodelete`)
- **Smart Message Cleanup**: Old buttons and metadata automatically removed when tracks change
- **Lyrics Auto-cleanup**: Lyrics messages (both regular and live) are automatically deleted when song ends
- **Streaming Optimization**: Significantly improved buffer settings to prevent sound breaking after 20-30 minutes:
  - Increased live buffer from 20s to 40s
  - Increased chunk size from 4MB to 10MB  
  - Extended connection timeout from 30s to 60s
  - Lavalink resume timeout increased to 300s
  - More reconnection attempts (50 instead of 25)
  - Better error recovery and connection stability
- **Sleep Command Enhancement**: Added "sl" alias for quick access to sleep timer
- **Prefix System Overhaul**: Completely redesigned prefix management:
  - Simplified command: `/setprefix <new_prefix>` (no more subcommands)
  - User/Guild selection via interactive buttons
  - Personal prefix support (user-specific prefix that works everywhere)
  - Server prefix with permission checks (Admin/Moderator/Owner only)
  - Automatic announcement when server prefix is changed
  - Data persists through restarts (saved to Firebase)

#### Lyrics System Upgrade (October 2025)
- **LRCLIB API Integration**: Replaced previous lyrics service with powerful LRCLIB API
- **No API key required**: Completely free service with no authentication needed
- **Synced/Timestamped Lyrics**: Full support for LRC format with precise timing
- **Live Lyrics Feature**: Real-time synced lyrics display with interactive button
- **Auto-updating display**: Live lyrics update every 2 seconds showing current line
- **Context view**: Shows 3 lines before and after current lyric for better reading
- **Smart timestamp parsing**: Handles both centisecond (2-digit) and millisecond (3-digit) precision
- **Better search**: Multiple fallback searches (artist + track, track only, album track)
- **Enhanced UI**: Pink-colored embeds with clear visual indicators for synced content

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
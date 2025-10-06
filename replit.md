# RasaVedic Music Bot

## Overview
RasaVedic is a Discord music bot built with discord.js and discord-player, designed to provide high-quality audio streaming. It integrates with Lavalink for efficient audio processing and supports various sources including SoundCloud, Apple Music, Vimeo, and ReverbNation. The bot features a command-based architecture with role-based permissions, persistent guild settings, advanced playback controls like audio filters and equalizers, and comprehensive queue management. The project aims to offer a smooth, reliable, and feature-rich music experience on Discord.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Docker**: Containerized deployment.
- **PM2**: Process management for Node.js applications.
- **Replit**: Cloud-based hosting compatibility.
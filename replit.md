# Mirasaki Music Bot

## Overview

A Discord music bot built with discord.js and discord-player that provides high-quality audio streaming through Lavalink integration. The bot supports multiple audio sources including SoundCloud, Apple Music, Vimeo, and ReverbNation. It features a command-based architecture with role-based permissions, persistent guild settings, and advanced playback controls including audio filters, equalizers, and queue management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Discord.js v14**: Modern Discord API wrapper with gateway intents for guilds, voice states, and messages
- **Discord-player v6**: Audio playback framework handling track extraction, queuing, and streaming
- **Node.js**: Runtime environment (version 20.x-21.x required)

### Audio Streaming Architecture
**Problem**: Efficient, high-quality audio streaming with minimal resource overhead  
**Solution**: Lavalink integration as primary audio server  
**Implementation**:
- WebSocket-based connection to Lavalink v4 nodes
- Offloaded audio processing to dedicated Lavalink servers
- Fallback extractors (@discord-player/extractor) for direct streaming
- Configurable node selection via environment variables
- Default public Lavalink node: `lava-v4.ajieblogs.eu.org:80`

**Rationale**: Separates audio processing from bot logic, improves performance and scalability

### Command System
**Problem**: Flexible, extensible command handling with permissions and cooldowns  
**Solution**: Class-based command architecture with ChatInputCommand base class  
**Features**:
- Slash command support (Application Commands API)
- Auto-complete for music queries and command parameters
- Permission levels: User, Moderator, Administrator, Server Owner, Developer, Bot Owner
- Command cooldowns with multiple scopes (user, member, guild, channel, global)
- Dynamic command loading from file system
- Command aliases and categories

**Design Pattern**: Commands inherit from ChatInputCommand class, providing consistent structure and automatic registration

### Permission System
**Problem**: Granular access control for different command types  
**Solution**: Multi-tier permission system with role-based and permission-based checks  
**Levels**:
1. User (default)
2. Moderator (configurable DJ roles)
3. Administrator (Discord admin permission)
4. Server Owner
5. Developer (configurable user IDs)
6. Bot Owner

**Rationale**: Separates music control permissions (DJ roles) from administrative functions while maintaining flexibility

### Data Persistence
**Problem**: Storing guild-specific settings without external database dependency  
**Solution**: LokiJS in-memory database with file system persistence  
**Schema**:
```javascript
{
  guildId: string (unique),
  volume: number,
  repeatMode: number,
  leaveOnEmpty: boolean,
  leaveOnEmptyCooldown: number,
  leaveOnEndCooldown: number,
  useThreadSessions: boolean,
  threadSessionStrictCommandChannel: boolean,
  musicChannels: string[],
  djRoles: string[],
  equalizer: string,
  audioFilters: string[]
}
```

**Persistence**: Auto-save every hour, auto-load on startup  
**Rationale**: Fast in-memory operations with disk persistence, no external database required

### Music Session Management
**Problem**: Managing playback state and user interaction across multiple guilds  
**Solution**: Thread-based session isolation with guild-specific queues  
**Features**:
- Optional dedicated thread creation per music session
- Thread-only command restriction option
- Automatic thread archival on session end
- Event-driven queue updates (playerStart, audioTrackAdd, etc.)
- Guild-specific player nodes via discord-player

**Rationale**: Reduces channel spam and provides focused music control interface

### Audio Processing
**Problem**: Advanced audio manipulation and filtering  
**Solution**: FFmpeg-based audio filters and equalizer presets  
**Capabilities**:
- Biquad filters with configurable gain
- Equalizer presets (Bass, Rock, Electronic, etc.)
- Custom audio filter chains
- Real-time filter toggling
- Persistent filter configurations per guild

**Implementation**: discord-player's FFmpegFilterer with GuildQueueAudioFilters

### Vote System
**Problem**: Democratic skip control in shared voice channels  
**Solution**: In-memory vote tracking with strict majority requirement  
**Logic**:
- Caches votes per guild and track
- Resets on track change
- Requires >50% of voice channel members (excluding bot)
- Automatic vote reset between tracks

**Rationale**: Prevents single-user disruption while maintaining simplicity

### Configuration Management
**Problem**: Flexible deployment configuration without code changes  
**Solution**: Environment-based configuration with fallback defaults  
**Structure**:
- `.env` file for sensitive credentials and deployment settings
- `config.js` for feature defaults and behavior settings
- Runtime mode detection (production, development, test)

**Key Settings**: Volume, repeat mode, cooldowns, thread sessions, Lavalink connection

## External Dependencies

### Audio Services
- **Lavalink**: Standalone audio server for streaming (WebSocket connection)
  - Default: `lava-v4.ajieblogs.eu.org:80`
  - Alternative nodes available for redundancy
- **SoundCloud**: Music source via discord-player extractors
- **Apple Music**: Music source via discord-player extractors
- **Vimeo**: Video/audio source
- **ReverbNation**: Music platform integration

### Discord API
- **Discord.js**: Official Discord API library
- **@discordjs/rest**: REST API client for slash commands
- **Discord Gateway**: WebSocket connection for real-time events
- **Application Commands API**: Slash command registration and handling

### Development Tools
- **ESLint**: Code quality and style enforcement with SonarJS plugin
- **Semantic Release**: Automated versioning and changelog generation
- **Nodemon**: Development auto-reload
- **Commitizen**: Conventional commit formatting

### Deployment Options
- **Docker**: Containerized deployment with docker-compose support
- **PM2**: Process management for Node.js applications
- **Replit**: Cloud-based hosting compatibility

### Optional Services
- **Express**: REST API server for command documentation (when USE_API enabled)
- **Lyrics Extractor**: External lyrics fetching via @discord-player/extractor
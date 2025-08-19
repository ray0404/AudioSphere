# Overview

SoundWave is a fully functional progressive web application (PWA) music player built with React and Express. The application supports both local file uploads and Google Drive integration, allowing users to manage and play their music collection from multiple sources. It features a modern Spotify-inspired dark-themed interface with comprehensive audio playback controls, playlist management, search functionality, and offline capabilities through service worker implementation.

## Recent Changes (August 2025)
- ✅ Complete PWA implementation with install prompt and offline support
- ✅ Local file upload with comprehensive ID3 tag parsing (MP3, FLAC, WAV, M4A, AAC)
- ✅ Google Drive integration for accessing shared music folders with API authentication
- ✅ Spotify-inspired dark UI with custom color scheme (#9C4F2C primary, #121212 background, #ffbc12 accent)
- ✅ Advanced audio player with Web Audio API integration
- ✅ Full player controls: play/pause, seek, volume, shuffle, repeat, next/previous
- ✅ Sidebar navigation with library organization
- ✅ Real-time search across all tracks
- ✅ Service worker for offline caching and background sync
- ✅ Web app manifest for installability on devices
- ✅ Mobile-optimized interface with hamburger menu and responsive design
- ✅ Complete Library page with albums, artists, and categorized views
- ✅ Complete Search page with search history and advanced filtering
- ✅ Fixed audio loading issues and improved error handling
- ✅ Optimized scrolling performance for mobile devices
- ✅ Single-track playback enforcement (only one track plays at a time)
- ✅ Persistent bottom media player bar across all pages
- ✅ **Full Media Session API integration with mobile device controls (lock screen, notification bar)**
- ✅ Enhanced MobileAudioManager for reliable cross-browser media control support
- ✅ Navigation callbacks for previous/next track from device controls
- ✅ Google Drive proxy endpoint for secure authenticated streaming
- ✅ Enhanced playback persistence across page switches and app backgrounding

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Audio Processing**: Custom AudioManager class using Web Audio API for advanced audio control
- **PWA Features**: Service worker for offline caching, web app manifest for installability

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints for tracks, playlists, and user preferences
- **Development Server**: Vite integration for hot module replacement in development
- **File Processing**: Custom ID3 parser for extracting metadata from audio files
- **Storage Interface**: Abstract storage layer with in-memory implementation (easily extensible to database)

## Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL
- **Local Storage**: In-memory storage implementation as fallback/development option
- **File Storage**: Local file system with Base64 encoding for audio files

## Database Schema
- **Tracks**: Audio file metadata including title, artist, album, duration, file URL, and JSON metadata
- **Playlists**: Named collections of track IDs with system playlist support
- **User Preferences**: Playback settings including volume, shuffle, repeat, and current playback state

## External Dependencies
- **Google Drive Integration**: API access for importing music files from user's Google Drive
- **Font Services**: Google Fonts for typography (Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter)
- **Development Tools**: Replit-specific plugins for development environment integration
- **Audio Codecs**: Support for MP3, WAV, FLAC, M4A, and AAC formats through Web Audio API

The application uses a monorepo structure with shared TypeScript types and schemas between client and server, ensuring type safety across the full stack. The modular component architecture allows for easy extension and maintenance of features.
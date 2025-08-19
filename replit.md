# Overview

SoundWave is a progressive web application (PWA) music player built with React and Express. It supports local file uploads and Google Drive integration, allowing users to manage and play their music collection from multiple sources. The application features a modern dark-themed interface with playlist management, audio playback controls, and offline capabilities through service worker implementation.

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
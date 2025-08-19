# SoundWave - Progressive Web Audio Player

## Overview
A cutting-edge progressive web audio player designed for seamless, intelligent music management across devices with advanced playback and discovery features.

### Key Features
- **Device Scanning**: Scan local device folders and files for audio without uploading
- **PWA Support**: Works offline with service workers
- **Media Session API**: Integrates with system media controls
- **IndexedDB Storage**: Local storage for offline playback
- **ID3 Tag Parsing**: Automatic metadata extraction
- **Multiple Sources**: Support for local files, device scanning, and Google Drive

## Recent Changes (January 20, 2025)

### Device Scanning Feature Added
- **New Device Scanner**: Users can now scan their device for audio files
  - Folder scanning using File System Access API (desktop browsers)
  - Individual file selection (all browsers)
  - Quick scan for common music locations
  - Files are played directly from device without uploading
  - Automatic ID3 tag parsing for metadata
  - Support for MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, WMA, ALAC, AIFF, APE, WEBM formats

### Components Added
- `useDeviceScanner` hook: Handles device scanning logic
- `DeviceScannerDialog` component: UI for device scanning
- Updated Sidebar with "Scan Device" button

## Project Architecture

### Technology Stack
- **Frontend**: TypeScript, React, Vite
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (via Drizzle ORM)
- **Storage**: IndexedDB for offline audio storage
- **PWA**: Service Workers for offline functionality
- **UI**: Tailwind CSS, shadcn/ui components

### File Structure
```
client/
├── src/
│   ├── components/
│   │   ├── device-scanner-dialog.tsx  # Device scanning UI
│   │   ├── bottom-player.tsx         # Audio player controls
│   │   └── sidebar.tsx               # Navigation sidebar
│   ├── hooks/
│   │   ├── use-device-scanner.tsx    # Device scanning logic
│   │   ├── use-audio-player.tsx      # Audio playback logic
│   │   └── use-file-upload.tsx       # File upload handling
│   ├── lib/
│   │   ├── mobile-audio-manager.ts   # Mobile audio handling
│   │   ├── id3-parser.ts             # ID3 tag parsing
│   │   └── offline-storage.ts        # IndexedDB management
│   └── pages/
│       ├── home.tsx
│       ├── library.tsx
│       └── search.tsx
server/
├── routes.ts                          # API endpoints
├── storage.ts                         # Data storage interface
└── index.ts                           # Server entry point
shared/
└── schema.ts                          # Database schema definitions
```

### Data Flow
1. **Device Scanning**: User selects folder/files → Parse metadata → Store in DB → Play directly
2. **File Upload**: User uploads files → Convert to data URL (small) or blob URL (large) → Store in DB
3. **Playback**: Load track → Create audio context → Play with controls → Update Media Session

## User Preferences
- Keep audio files on device without uploading to servers
- Support for direct playback from device storage
- Maintain privacy by not uploading personal music files

## Development Guidelines
- Use in-memory storage for development
- Always validate with Zod schemas
- Keep frontend logic minimal, backend handles persistence
- Use React Query for all data fetching
- Implement proper error handling with user-friendly messages

## Features Roadmap
- [ ] Playlist management
- [ ] Recently played tracking
- [ ] Artists and albums pages
- [ ] Advanced search functionality
- [ ] Cloud sync across devices
- [ ] Equalizer and audio effects
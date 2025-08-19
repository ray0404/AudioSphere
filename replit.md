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

### Full-Screen Now Playing Implementation ✅
- **Apple Music-style Now Playing**: Complete full-screen experience with dynamic design
  - Click track info area in bottom player or swipe up on mobile to open
  - Dynamic background colors extracted from album artwork 
  - Smooth animations and transitions for opening/closing
  - Swipe down to close (prevents browser pull-to-refresh conflict)
  - Fully functional audio controls: play/pause, next/previous, seeking, volume
  - Connected shuffle and repeat toggles with visual state indicators
  - Proper volume slider with real-time audio control
  - Progress bar scrubbing with actual seek functionality
  - Responsive design for mobile and desktop

### Artists & Albums Pages Implementation
- **Comprehensive Artists Page**: Full hierarchical navigation (Artists → Albums → Songs)
  - Metadata-based artist grouping from ID3 tags
  - Artist page shows all albums by artist
  - Album page shows all songs in album
  - Play functionality at all levels (artist, album, track)
  - Proper back navigation between levels

- **Dedicated Albums Page**: Complete album browsing experience
  - All albums listed with artist names displayed underneath
  - Click album to view all songs in that album
  - Album artwork display with fallback images
  - Track count and duration information
  - Play album functionality

### Device Scanning Feature Added
- **New Device Scanner**: Users can now scan their device for audio files
  - Folder scanning using File System Access API (desktop browsers)
  - Individual file selection (all browsers)
  - Quick scan for common music locations
  - Files are played directly from device without uploading
  - Automatic ID3 tag parsing for metadata
  - Support for MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, WMA, ALAC, AIFF, APE, WEBM formats

### Mobile Optimizations
- **Fixed Mobile Scrolling**: Resolved touch scrolling issues on library page
  - Removed overflow constraints that prevented natural scrolling
  - Enhanced touch event handling for better mobile interaction
  - Optimized CSS for smooth scrolling performance

### Contextual Play Queue Implementation ✅
- **Smart Queue Creation**: When users play a track from any list, creates queue starting from selected track
  - Library page: Queue from selected track through end of filtered/search results
  - Artists page: Queue from selected track through rest of album
  - Albums page: Queue from selected track through rest of album
  - Automatic playlist management with proper track progression
  - Seamless integration with existing shuffle and repeat functionality

### Components Added/Updated
- `now-playing.tsx` component: Full-screen Apple Music-style interface with all functionality
- `artists.tsx` page: Complete artist browsing with hierarchical navigation and contextual queues
- `albums.tsx` page: Dedicated album browsing experience with contextual queues
- `library.tsx` page: Enhanced with contextual play queue functionality
- `useAudioPlayer` hook: Added `playFromList` function for contextual queue creation
- `useDeviceScanner` hook: Handles device scanning logic
- `DeviceScannerDialog` component: UI for device scanning
- Updated Sidebar with "Scan Device" button
- Enhanced bottom-player.tsx with click/swipe handlers for Now Playing
- Fixed persistent button focus states in Now Playing controls

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
│       ├── home.tsx                  # Dashboard/landing page
│       ├── library.tsx               # Main track listing
│       ├── artists.tsx               # Artist browsing with hierarchical nav
│       ├── albums.tsx                # Album browsing with track listings
│       └── search.tsx                # Search functionality
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
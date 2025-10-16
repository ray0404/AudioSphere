# SoundWave

## High-Level Summary

This repository contains the source code for **SoundWave**, a progressive web audio player. The application is designed to be a modern, offline-first music player that allows users to play their own music from various sources, including local files, their device's file system, and Google Drive. The project has a strong emphasis on a clean user interface, mobile-friendliness, and a seamless user experience.

## Core "Vibes" / Design Philosophy

* **User-Owned Music:** The central theme of this project is empowering users to listen to their own music without being tied to a specific streaming service.
* **Offline First:** The application is designed to be fully functional without an internet connection, making it a true PWA.
* **Modern & Minimalist UI:** The project uses a modern tech stack with a focus on a clean, uncluttered, and responsive user interface, heavily inspired by platforms like Apple Music.
* **Mobile is a Priority:** The application is designed with mobile users in mind, with a responsive layout and mobile-specific features.
* **"It Just Works":** The project aims for a smooth and intuitive user experience where features work as expected without a steep learning curve.

---

## Technology Stack & Architecture

* **Frontend:**
    * **Framework:** React with TypeScript and Vite for a fast development experience.
    * **Styling:** Tailwind CSS with `shadcn/ui` for a modern, component-based UI.
    * **Routing:** `wouter` for a minimalist approach to routing.
    * **Data Fetching:** React Query for managing server state and caching.
* **Backend:**
    * **Framework:** Express.js with TypeScript.
    * **Database:** PostgreSQL with Drizzle ORM for type-safe database access. For development, it uses an in-memory storage (`MemStorage`).
* **PWA & Offline:**
    * **Service Workers:** For offline caching of assets and API requests.
    * **IndexedDB:** For storing track metadata and audio blobs for offline playback, managed by the `OfflineStorage` class.

---

## Key Functionalities & Code Walkthrough

### 1. Audio Playback

* **Core Logic:** The `useAudioPlayer` hook (`client/src/hooks/use-audio-player.tsx`) is the heart of the audio playback system. It manages the current track, playback state, volume, shuffle/repeat, and the playlist.
* **Mobile Audio:** The `MobileAudioManager` class (`client/src/lib/mobile-audio-manager.ts`) is a custom audio handler optimized for mobile devices, using the Media Session API to integrate with system media controls.
* **UI:**
    * `BottomPlayer` (`client/src/components/bottom-player.tsx`): The persistent mini-player at the bottom of the screen.
    * `NowPlaying` (`client/src/components/now-playing.tsx`): The full-screen, Apple Music-style "Now Playing" view with dynamic background colors extracted from the album art.

### 2. Music Sources

* **Local File Upload:**
    * **Hook:** `useFileUpload` (`client/src/hooks/use-file-upload.tsx`) handles the logic for uploading files, including parsing ID3 tags and saving the tracks to the backend.
    * **Component:** `UploadArea` (`client/src/components/upload-area.tsx`) provides the UI for dragging and dropping or selecting files.
* **Device Scanning:**
    * **Hook:** `useDeviceScanner` (`client/src/hooks/use-device-scanner.tsx`) uses the File System Access API to let users scan their local device for music files without uploading them.
    * **Component:** `DeviceScannerDialog` (`client/src/components/device-scanner-dialog.tsx`) provides the UI for initiating a device scan.
* **Google Drive Integration:**
    * **Hook:** `useGoogleDrive` (`client/src/hooks/use-google-drive.tsx`) manages the connection to Google Drive, fetching files from a shared folder, and importing them into the application.

### 3. User Interface & Pages

* **Main App:** `App.tsx` (`client/src/App.tsx`) is the main component that orchestrates the layout, including the sidebar, main content area, and the bottom player.
* **Pages:** The `client/src/pages` directory contains the main views of the application:
    * `home.tsx`: The main dashboard.
    * `library.tsx`: A view of all the user's tracks.
    * `artists.tsx` & `albums.tsx`: Pages for browsing music by artist and album, respectively.
    * `search.tsx`: A dedicated search page.
* **UI Components:** The `client/src/components/ui` directory contains the `shadcn/ui` components that form the building blocks of the UI.

---

## Development & Debugging

* **In-Memory Storage:** The backend uses an in-memory database (`MemStorage`) for development, which means the data is reset every time the server restarts. This is great for testing but means no data persistence between sessions.
* **PWA Debugging:** The `pwa-debug.js` file (`client/public/pwa-debug.js`) provides a set of tools for debugging PWA functionality, including checking for a manifest, service worker registration, and HTTPS.
* **Vite & HMR:** The project uses Vite, which provides a fast development server with Hot Module Replacement (HMR) for a smooth development experience.

---

## Potential Areas for Improvement & Future Features

Based on the `replit.md` file and the current state of the code, here are some areas for future development:

* **Playlist Management:** The backend schema for playlists is already defined, but the UI for creating, editing, and managing playlists has not been implemented yet.
* **Recently Played:** Similar to playlists, the backend has support for tracking recently played songs, but the frontend implementation is still pending.
* **Advanced Search:** The current search functionality is basic. It could be expanded to include more advanced filtering and sorting options.
* **Cloud Sync:** The roadmap mentions cloud sync, which would allow users to sync their library across multiple devices. This would likely require moving from the in-memory storage to a persistent database and adding user authentication.
* **Equalizer & Audio Effects:** The roadmap also includes plans for an equalizer and other audio effects, which would require more advanced use of the Web Audio API.

This analysis should provide a solid foundation for our work on SoundWave. I'm ready to help you build out these features and continue to improve the "vibe" of your project! ✨

export interface MediaSessionTrack {
  title: string;
  artist: string;
  album: string;
  artwork?: string;
  duration?: number;
}

export class MediaSessionManager {
  private audioElement: HTMLAudioElement;
  private isInitialized = false;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'metadata';
    this.setupAudioElement();
    this.initializeMediaSession();
  }

  private setupAudioElement() {
    // Prevent multiple audio elements from playing
    this.audioElement.addEventListener('play', () => {
      // Pause any other audio elements
      const otherAudioElements = document.querySelectorAll('audio');
      otherAudioElements.forEach(audio => {
        if (audio !== this.audioElement && !audio.paused) {
          audio.pause();
        }
      });
    });

    // Update media session on audio events
    this.audioElement.addEventListener('loadedmetadata', () => {
      this.updatePositionState();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.updatePositionState();
    });

    this.audioElement.addEventListener('play', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    this.audioElement.addEventListener('pause', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    this.audioElement.addEventListener('ended', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });
  }

  private initializeMediaSession() {
    if (!('mediaSession' in navigator)) {
      console.warn('MediaSession API not supported');
      return;
    }

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      this.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.seekTo(details.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.seekTo(Math.max(this.audioElement.currentTime - skipTime, 0));
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.seekTo(Math.min(this.audioElement.currentTime + skipTime, this.audioElement.duration));
    });

    this.isInitialized = true;
  }

  async loadTrack(url: string, track: MediaSessionTrack): Promise<void> {
    try {
      this.audioElement.src = url;
      await new Promise((resolve, reject) => {
        this.audioElement.addEventListener('loadeddata', resolve, { once: true });
        this.audioElement.addEventListener('error', reject, { once: true });
        this.audioElement.load();
      });

      // Update metadata
      this.updateMetadata(track);
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  private updateMetadata(track: MediaSessionTrack) {
    if (!('mediaSession' in navigator)) return;

    const artwork = track.artwork ? [
      { src: track.artwork, sizes: '96x96', type: 'image/jpeg' },
      { src: track.artwork, sizes: '128x128', type: 'image/jpeg' },
      { src: track.artwork, sizes: '192x192', type: 'image/jpeg' },
      { src: track.artwork, sizes: '256x256', type: 'image/jpeg' },
      { src: track.artwork, sizes: '384x384', type: 'image/jpeg' },
      { src: track.artwork, sizes: '512x512', type: 'image/jpeg' }
    ] : undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      artwork
    });
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !this.audioElement.duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: this.audioElement.duration,
        playbackRate: this.audioElement.playbackRate,
        position: this.audioElement.currentTime
      });
    } catch (error) {
      console.warn('Failed to update position state:', error);
    }
  }

  play(): Promise<void> {
    return this.audioElement.play();
  }

  pause() {
    this.audioElement.pause();
  }

  seekTo(time: number) {
    this.audioElement.currentTime = time;
    this.updatePositionState();
  }

  setVolume(volume: number) {
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.audioElement.volume;
  }

  getCurrentTime(): number {
    return this.audioElement.currentTime;
  }

  getDuration(): number {
    return this.audioElement.duration || 0;
  }

  isPlaying(): boolean {
    return !this.audioElement.paused;
  }

  onTimeUpdate(callback: () => void) {
    this.audioElement.addEventListener('timeupdate', callback);
  }

  onEnded(callback: () => void) {
    this.audioElement.addEventListener('ended', callback);
  }

  destroy() {
    this.audioElement.pause();
    this.audioElement.src = '';
    this.audioElement.load();
  }
}
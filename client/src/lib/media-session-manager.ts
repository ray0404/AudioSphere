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
    
    // Add audio element to DOM to ensure it's properly tracked by the browser
    this.audioElement.style.display = 'none';
    document.body.appendChild(this.audioElement);
    
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
      if ('mediaSession' in navigator && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
        console.log('Media Session: Set playback state to playing');
      }
    });

    this.audioElement.addEventListener('pause', () => {
      if ('mediaSession' in navigator && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'paused';
        console.log('Media Session: Set playback state to paused');
      }
    });

    this.audioElement.addEventListener('ended', () => {
      if ('mediaSession' in navigator && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'paused';
        console.log('Media Session: Track ended, set to paused');
      }
    });
  }

  private initializeMediaSession() {
    // Check for MediaSession API with more robust detection
    const hasMediaSession = 'mediaSession' in navigator && 
                           navigator.mediaSession && 
                           typeof navigator.mediaSession.setActionHandler === 'function';
    
    if (!hasMediaSession) {
      console.warn('MediaSession API not available - device controls will not be shown');
      // Still initialize but without media session features
      this.isInitialized = true;
      return;
    }
    
    console.log('MediaSession API detected and initializing...');

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

      // Update metadata and activate media session
      this.updateMetadata(track);
      
      // Force activation of media session (if supported)
      if ('mediaSession' in navigator && navigator.mediaSession && typeof navigator.mediaSession.setActionHandler === 'function') {
        navigator.mediaSession.playbackState = 'paused';
        console.log('Media Session: Track loaded, metadata updated');
      }
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  private updateMetadata(track: MediaSessionTrack) {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return;

    const artwork = track.artwork ? [
      { src: track.artwork, sizes: '96x96', type: 'image/jpeg' },
      { src: track.artwork, sizes: '128x128', type: 'image/jpeg' },
      { src: track.artwork, sizes: '192x192', type: 'image/jpeg' },
      { src: track.artwork, sizes: '256x256', type: 'image/jpeg' },
      { src: track.artwork, sizes: '384x384', type: 'image/jpeg' },
      { src: track.artwork, sizes: '512x512', type: 'image/jpeg' }
    ] : undefined;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Unknown Album',
        artwork
      });
      console.log('Media Session: Metadata set for', track.title);
    } catch (error) {
      console.warn('Failed to set media session metadata:', error);
    }
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession || !this.audioElement.duration) return;

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

  async play(): Promise<void> {
    try {
      // Ensure user interaction has occurred for autoplay policy
      await this.audioElement.play();
      
      // Ensure media session is activated (if supported)
      if ('mediaSession' in navigator && navigator.mediaSession && typeof navigator.mediaSession.setActionHandler === 'function') {
        navigator.mediaSession.playbackState = 'playing';
        console.log('Media Session: Activated and playing');
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
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
    
    // Remove from DOM
    if (this.audioElement.parentNode) {
      this.audioElement.parentNode.removeChild(this.audioElement);
    }
  }
}
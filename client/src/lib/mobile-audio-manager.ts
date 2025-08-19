// Enhanced audio manager specifically optimized for mobile device controls
export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
}

export class MobileAudioManager {
  private audioElement: HTMLAudioElement;
  private currentMetadata: AudioMetadata | null = null;
  private hasMediaSession = false;
  private onPreviousCallback?: () => void;
  private onNextCallback?: () => void;

  constructor() {
    this.audioElement = new Audio();
    this.setupAudioElement();
    this.detectAndInitializeMediaSession();
  }

  private setupAudioElement() {
    // Configure audio element for maximum compatibility
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'metadata';
    this.audioElement.controls = false;
    
    // Add to DOM but keep hidden - critical for mobile recognition
    this.audioElement.style.position = 'fixed';
    this.audioElement.style.top = '-9999px';
    this.audioElement.style.left = '-9999px';
    this.audioElement.style.width = '1px';
    this.audioElement.style.height = '1px';
    this.audioElement.style.opacity = '0';
    this.audioElement.style.pointerEvents = 'none';
    this.audioElement.setAttribute('aria-hidden', 'true');
    
    // Essential for mobile device recognition
    this.audioElement.setAttribute('data-player', 'soundwave');
    
    document.body.appendChild(this.audioElement);

    // Add event listeners for state tracking
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.audioElement.addEventListener('loadstart', () => {
      console.log('Audio: Load started');
      this.activateMediaSession();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      console.log('Audio: Metadata loaded');
      this.updateMediaSessionMetadata();
    });

    this.audioElement.addEventListener('play', () => {
      console.log('Audio: Playing');
      this.setMediaSessionState('playing');
    });

    this.audioElement.addEventListener('pause', () => {
      console.log('Audio: Paused');
      this.setMediaSessionState('paused');
    });

    this.audioElement.addEventListener('ended', () => {
      console.log('Audio: Ended');
      this.setMediaSessionState('paused');
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.updatePositionState();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });
  }

  private detectAndInitializeMediaSession() {
    // Enhanced detection for MediaSession API
    try {
      this.hasMediaSession = !!(
        'mediaSession' in navigator &&
        navigator.mediaSession &&
        typeof navigator.mediaSession.setActionHandler === 'function' &&
        typeof navigator.mediaSession.metadata !== 'undefined'
      );

      if (this.hasMediaSession) {
        console.log('✓ MediaSession API detected and available');
        this.initializeMediaSessionHandlers();
      } else {
        console.log('ℹ MediaSession API not available (this is normal in development or non-HTTPS environments)');
      }
    } catch (error) {
      console.warn('Error checking MediaSession support:', error);
      this.hasMediaSession = false;
    }
  }

  private initializeMediaSessionHandlers() {
    if (!this.hasMediaSession || !navigator.mediaSession) return;

    try {
      // Set up action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('MediaSession: Play action triggered');
        this.audioElement.play().catch(e => console.error('Play failed:', e));
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('MediaSession: Pause action triggered');
        this.audioElement.pause();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          console.log('MediaSession: Seek to', details.seekTime);
          this.audioElement.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('MediaSession: Previous track');
        if (this.onPreviousCallback) {
          this.onPreviousCallback();
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('MediaSession: Next track');
        if (this.onNextCallback) {
          this.onNextCallback();
        }
      });

      console.log('✓ MediaSession handlers initialized');
    } catch (error) {
      console.error('Failed to set up MediaSession handlers:', error);
    }
  }

  private activateMediaSession() {
    if (!this.hasMediaSession || !navigator.mediaSession) return;

    try {
      // Force activation by setting initial state
      navigator.mediaSession.playbackState = 'paused';
      console.log('MediaSession: Activated');
    } catch (error) {
      console.warn('Failed to activate MediaSession:', error);
    }
  }

  private updateMediaSessionMetadata() {
    if (!this.hasMediaSession || !navigator.mediaSession || !this.currentMetadata) return;

    try {
      const artwork = this.currentMetadata.artwork ? [
        { src: this.currentMetadata.artwork, sizes: '96x96', type: 'image/png' },
        { src: this.currentMetadata.artwork, sizes: '128x128', type: 'image/png' },
        { src: this.currentMetadata.artwork, sizes: '192x192', type: 'image/png' },
        { src: this.currentMetadata.artwork, sizes: '256x256', type: 'image/png' },
        { src: this.currentMetadata.artwork, sizes: '384x384', type: 'image/png' },
        { src: this.currentMetadata.artwork, sizes: '512x512', type: 'image/png' }
      ] : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentMetadata.title || 'Unknown Title',
        artist: this.currentMetadata.artist || 'Unknown Artist',
        album: this.currentMetadata.album || 'Unknown Album',
        artwork
      });

      console.log('✓ MediaSession metadata updated:', this.currentMetadata.title);
    } catch (error) {
      console.error('Failed to update MediaSession metadata:', error);
    }
  }

  private setMediaSessionState(state: 'playing' | 'paused') {
    if (!this.hasMediaSession || !navigator.mediaSession) return;

    try {
      navigator.mediaSession.playbackState = state;
      console.log(`MediaSession: State set to ${state}`);
    } catch (error) {
      console.warn('Failed to set MediaSession state:', error);
    }
  }

  private updatePositionState() {
    if (!this.hasMediaSession || !navigator.mediaSession || !this.audioElement.duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: this.audioElement.duration,
        playbackRate: this.audioElement.playbackRate,
        position: this.audioElement.currentTime
      });
    } catch (error) {
      // Position state updates can fail frequently, so don't log every error
    }
  }

  // Public API
  async loadTrack(url: string, metadata: AudioMetadata): Promise<void> {
    console.log('Loading track:', metadata.title);
    
    this.currentMetadata = metadata;
    this.audioElement.src = url;
    
    return new Promise((resolve, reject) => {
      const onLoad = () => {
        this.audioElement.removeEventListener('loadeddata', onLoad);
        this.audioElement.removeEventListener('error', onError);
        this.updateMediaSessionMetadata();
        this.activateMediaSession();
        resolve();
      };
      
      const onError = () => {
        this.audioElement.removeEventListener('loadeddata', onLoad);
        this.audioElement.removeEventListener('error', onError);
        reject(new Error('Failed to load audio'));
      };
      
      this.audioElement.addEventListener('loadeddata', onLoad);
      this.audioElement.addEventListener('error', onError);
      this.audioElement.load();
    });
  }

  async play(): Promise<void> {
    try {
      await this.audioElement.play();
      this.setMediaSessionState('playing');
    } catch (error) {
      console.error('Play failed:', error);
      throw error;
    }
  }

  pause(): void {
    this.audioElement.pause();
    this.setMediaSessionState('paused');
  }

  seekTo(time: number): void {
    this.audioElement.currentTime = time;
  }

  setVolume(volume: number): void {
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
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

  onEnded(callback: () => void): void {
    this.audioElement.addEventListener('ended', callback);
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.audioElement.addEventListener('timeupdate', () => {
      callback(this.audioElement.currentTime);
    });
  }

  setNavigationCallbacks(onPrevious: () => void, onNext: () => void): void {
    this.onPreviousCallback = onPrevious;
    this.onNextCallback = onNext;
  }

  destroy(): void {
    this.audioElement.pause();
    this.audioElement.src = '';
    
    if (this.audioElement.parentNode) {
      this.audioElement.parentNode.removeChild(this.audioElement);
    }
  }
}
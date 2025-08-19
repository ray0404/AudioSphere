export class AudioManager {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  async loadAudioFile(file: File | string): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    try {
      let arrayBuffer: ArrayBuffer;

      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer();
      } else {
        // URL string - handle different URL types
        let fetchUrl = file;
        
        // Check if it's a data URL (base64)
        if (file.startsWith('data:')) {
          // Convert data URL to blob
          const response = await fetch(file);
          const blob = await response.blob();
          arrayBuffer = await blob.arrayBuffer();
        } else {
          // Regular URL - handle Google Drive API URLs
          const headers: Record<string, string> = {
            'Accept': 'audio/*,*/*;q=0.9',
          };
          
          // For Google Drive API URLs, we need different handling
          if (file.includes('googleapis.com/drive')) {
            headers['Range'] = 'bytes=0-'; // Request full file
          }
          
          const response = await fetch(fetchUrl, { headers });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          }
          
          arrayBuffer = await response.arrayBuffer();
        }
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Invalid or empty audio data');
      }

      this.currentBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw error;
    }
  }

  play(startPosition: number = 0): void {
    if (!this.audioContext || !this.currentBuffer || !this.gainNode) {
      console.error('Audio not properly initialized');
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Stop current playback if any
    this.stop();

    // Create new source
    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = this.currentBuffer;
    this.currentSource.connect(this.gainNode);

    // Start playback
    this.startTime = this.audioContext.currentTime - startPosition;
    this.currentSource.start(0, startPosition);
    this.isPlaying = true;

    // Handle end of playback
    this.currentSource.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentSource = null;
    });
  }

  pause(): void {
    if (this.isPlaying && this.currentSource) {
      this.pauseTime = this.getCurrentTime();
      this.currentSource.stop();
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (!this.isPlaying && this.pauseTime > 0) {
      this.play(this.pauseTime);
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
    this.startTime = 0;
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    
    return this.pauseTime;
  }

  getDuration(): number {
    return this.currentBuffer?.duration || 0;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      // Clamp volume between 0 and 1
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getVolume(): number {
    return this.gainNode?.gain.value || 0;
  }

  seekTo(position: number): void {
    if (this.isPlaying) {
      this.play(position);
    } else {
      this.pauseTime = position;
    }
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    return dataArray;
  }

  getPlaybackState(): { isPlaying: boolean; currentTime: number; duration: number } {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    };
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const createAudioURL = (file: File): string => {
  return URL.createObjectURL(file);
};

export const revokeAudioURL = (url: string): void => {
  URL.revokeObjectURL(url);
};

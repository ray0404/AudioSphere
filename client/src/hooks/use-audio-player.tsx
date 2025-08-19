import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaSessionManager } from '@/lib/media-session-manager';
import { formatTime } from '@/lib/audio-utils';
import { Track } from '@shared/schema';

interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: boolean;
  playlist: Track[];
  currentIndex: number;
}

export function useAudioPlayer() {
  const mediaSessionRef = useRef<MediaSessionManager | null>(null);
  
  const [state, setState] = useState<AudioPlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    shuffle: false,
    repeat: false,
    playlist: [],
    currentIndex: -1,
  });

  // Initialize Media Session Manager
  useEffect(() => {
    mediaSessionRef.current = new MediaSessionManager();
    
    // Set up event listeners
    mediaSessionRef.current.onTimeUpdate(() => {
      if (mediaSessionRef.current) {
        setState(prev => ({
          ...prev,
          currentTime: mediaSessionRef.current!.getCurrentTime(),
          duration: mediaSessionRef.current!.getDuration(),
          isPlaying: mediaSessionRef.current!.isPlaying()
        }));
      }
    });

    // nextTrack will be defined later, so we'll set this up in another effect
    
    return () => {
      mediaSessionRef.current?.destroy();
    };
  }, []);

  // Setup additional Media Session navigation handlers
  useEffect(() => {
    if ('mediaSession' in navigator && mediaSessionRef.current) {
      // Track navigation handlers
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (state.playlist.length > 0) {
          let prevIndex = state.currentIndex - 1;
          if (prevIndex < 0) prevIndex = state.playlist.length - 1;
          setState(prev => ({ ...prev, currentIndex: prevIndex }));
          const prevTrack = state.playlist[prevIndex];
          if (prevTrack) {
            play(prevTrack);
          }
        }
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (state.playlist.length > 0) {
          let nextIndex = state.currentIndex + 1;
          if (nextIndex >= state.playlist.length) nextIndex = 0;
          setState(prev => ({ ...prev, currentIndex: nextIndex }));
          const nextTrack = state.playlist[nextIndex];
          if (nextTrack) {
            play(nextTrack);
          }
        }
      });
    }
  }, [state.currentTrack, state.playlist, state.currentIndex]);

  // We'll set up the end handler after nextTrack is defined

  const loadTrack = useCallback(async (track: Track) => {
    if (!mediaSessionRef.current) return;

    try {
      console.log('Loading track:', track.title, 'from URL:', track.fileUrl);
      await mediaSessionRef.current.loadTrack(track.fileUrl, {
        title: track.title,
        artist: track.artist,
        album: track.album || 'Unknown Album',
        artwork: track.albumArt || undefined
      });
      setState(prev => ({
        ...prev,
        currentTrack: track,
        currentTime: 0,
        duration: mediaSessionRef.current?.getDuration() || 0,
      }));
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }, []);

  const play = useCallback(async (track?: Track) => {
    if (!mediaSessionRef.current) return;

    // Single-track enforcement: always pause current audio first
    if (state.isPlaying) {
      mediaSessionRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }

    // If new track is provided and different from current, load it
    if (track && (!state.currentTrack || track.id !== state.currentTrack.id)) {
      await loadTrack(track);
    }

    // Play the current track
    if (state.currentTrack || track) {
      await mediaSessionRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack, state.isPlaying, loadTrack]);

  // Media Session API is now handled by MediaSessionManager

  const pause = useCallback(() => {
    if (!mediaSessionRef.current) return;
    
    mediaSessionRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback((position: number) => {
    if (!mediaSessionRef.current) return;
    
    mediaSessionRef.current.seekTo(position);
    setState(prev => ({ ...prev, currentTime: position }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!mediaSessionRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    mediaSessionRef.current.setVolume(clampedVolume);
    setState(prev => ({ 
      ...prev, 
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    if (!mediaSessionRef.current) return;
    
    if (state.isMuted) {
      mediaSessionRef.current.setVolume(state.volume);
      setState(prev => ({ ...prev, isMuted: false }));
    } else {
      mediaSessionRef.current.setVolume(0);
      setState(prev => ({ ...prev, isMuted: true }));
    }
  }, [state.isMuted, state.volume]);

  const setPlaylist = useCallback((tracks: Track[], startIndex: number = 0) => {
    setState(prev => ({
      ...prev,
      playlist: tracks,
      currentIndex: startIndex,
    }));

    if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
      play(tracks[startIndex]);
    }
  }, [play]);

  const nextTrack = useCallback(() => {
    if (state.playlist.length === 0) return;

    let nextIndex: number;
    
    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.playlist.length);
    } else {
      nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.playlist.length) {
        if (state.repeat) {
          nextIndex = 0;
        } else {
          return; // End of playlist
        }
      }
    }

    setState(prev => ({ ...prev, currentIndex: nextIndex }));
    play(state.playlist[nextIndex]);
  }, [state.playlist, state.currentIndex, state.shuffle, state.repeat, play]);

  const previousTrack = useCallback(() => {
    if (state.playlist.length === 0) return;

    let prevIndex: number;
    
    if (state.shuffle) {
      prevIndex = Math.floor(Math.random() * state.playlist.length);
    } else {
      prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.repeat) {
          prevIndex = state.playlist.length - 1;
        } else {
          prevIndex = 0;
        }
      }
    }

    setState(prev => ({ ...prev, currentIndex: prevIndex }));
    play(state.playlist[prevIndex]);
  }, [state.playlist, state.currentIndex, state.shuffle, state.repeat, play]);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({ ...prev, repeat: !prev.repeat }));
  }, []);

  const getFormattedTime = useCallback((time: number) => {
    return formatTime(time);
  }, []);

  const getProgress = useCallback(() => {
    if (state.duration === 0) return 0;
    return (state.currentTime / state.duration) * 100;
  }, [state.currentTime, state.duration]);

  // Set up track end handler after nextTrack is defined
  useEffect(() => {
    if (mediaSessionRef.current) {
      mediaSessionRef.current.onEnded(() => {
        nextTrack();
      });
    }
  }, [nextTrack]);

  return {
    // State
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume,
    isMuted: state.isMuted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    playlist: state.playlist,
    currentIndex: state.currentIndex,
    
    // Actions
    play,
    pause,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    setPlaylist,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    loadTrack,
    
    // Utilities
    getFormattedTime,
    getProgress,
  };
}

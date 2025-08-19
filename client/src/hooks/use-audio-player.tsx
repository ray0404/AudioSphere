import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioManager, formatTime } from '@/lib/audio-utils';
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
  const audioManagerRef = useRef<AudioManager | null>(null);
  
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

  // Initialize audio manager 
  useEffect(() => {
    audioManagerRef.current = new AudioManager();
    
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);

  // Setup Media Session API handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioManagerRef.current && state.currentTrack) {
          audioManagerRef.current.play();
          setState(prev => ({ ...prev, isPlaying: true }));
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioManagerRef.current) {
          audioManagerRef.current.pause();
          setState(prev => ({ ...prev, isPlaying: false }));
        }
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (state.playlist.length > 0) {
          let prevIndex = state.currentIndex - 1;
          if (prevIndex < 0) prevIndex = state.playlist.length - 1;
          setState(prev => ({ ...prev, currentIndex: prevIndex }));
          play(state.playlist[prevIndex]);
        }
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (state.playlist.length > 0) {
          let nextIndex = state.currentIndex + 1;
          if (nextIndex >= state.playlist.length) nextIndex = 0;
          setState(prev => ({ ...prev, currentIndex: nextIndex }));
          play(state.playlist[nextIndex]);
        }
      });
    }
  }, [state.currentTrack, state.playlist, state.currentIndex]);

  // Update progress
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      if (audioManagerRef.current) {
        const playbackState = audioManagerRef.current.getPlaybackState();
        setState(prev => ({
          ...prev,
          currentTime: playbackState.currentTime,
          duration: playbackState.duration,
          isPlaying: playbackState.isPlaying,
        }));

        // Auto-advance to next track if current track ends
        if (playbackState.currentTime >= playbackState.duration && playbackState.duration > 0) {
          nextTrack();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  const loadTrack = useCallback(async (track: Track) => {
    if (!audioManagerRef.current) return;

    try {
      console.log('Loading track:', track.title, 'from URL:', track.fileUrl);
      await audioManagerRef.current.loadAudioFile(track.fileUrl);
      setState(prev => ({
        ...prev,
        currentTrack: track,
        currentTime: 0,
        duration: audioManagerRef.current?.getDuration() || 0,
      }));
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }, []);

  const play = useCallback(async (track?: Track) => {
    if (!audioManagerRef.current) return;

    // Single-track enforcement: always pause current audio first
    if (state.isPlaying) {
      audioManagerRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }

    // If new track is provided and different from current, load it
    if (track && (!state.currentTrack || track.id !== state.currentTrack.id)) {
      await loadTrack(track);
    }

    // Play the current track
    if (state.currentTrack || track) {
      audioManagerRef.current.play(0); // Always start from beginning for new tracks
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack, state.isPlaying, loadTrack]);

  const updateMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && state.currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentTrack.title,
        artist: state.currentTrack.artist,
        album: state.currentTrack.album,
        artwork: state.currentTrack.albumArt ? [
          { src: state.currentTrack.albumArt, sizes: '512x512', type: 'image/jpeg' }
        ] : undefined
      });
      
      navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
    }
  }, [state.currentTrack, state.isPlaying]);

  const pause = useCallback(() => {
    if (!audioManagerRef.current) return;
    
    audioManagerRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
    updateMediaSession();
  }, [updateMediaSession]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback((position: number) => {
    if (!audioManagerRef.current) return;
    
    audioManagerRef.current.seekTo(position);
    setState(prev => ({ ...prev, currentTime: position }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioManagerRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioManagerRef.current.setVolume(clampedVolume);
    setState(prev => ({ 
      ...prev, 
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioManagerRef.current) return;
    
    if (state.isMuted) {
      audioManagerRef.current.setVolume(state.volume);
      setState(prev => ({ ...prev, isMuted: false }));
    } else {
      audioManagerRef.current.setVolume(0);
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

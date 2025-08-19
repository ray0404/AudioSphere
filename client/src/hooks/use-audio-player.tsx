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

    if (track && track.id !== state.currentTrack?.id) {
      await loadTrack(track);
    }

    if (state.currentTrack) {
      audioManagerRef.current.play(state.currentTime);
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack, state.currentTime, loadTrack]);

  const pause = useCallback(() => {
    if (!audioManagerRef.current) return;
    
    audioManagerRef.current.pause();
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

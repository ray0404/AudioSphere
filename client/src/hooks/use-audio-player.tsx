import { useState, useEffect, useRef, useCallback } from 'react';
import { MobileAudioManager } from '@/lib/mobile-audio-manager';
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
  const audioManagerRef = useRef<MobileAudioManager | null>(null);
  
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

  // Initialize MobileAudioManager
  useEffect(() => {
    audioManagerRef.current = new MobileAudioManager();
    
    // Set up event listeners
    audioManagerRef.current.onTimeUpdate((currentTime) => {
      if (audioManagerRef.current) {
        setState(prev => ({
          ...prev,
          currentTime,
          duration: audioManagerRef.current!.getDuration(),
          isPlaying: audioManagerRef.current!.isPlaying()
        }));
      }
    });
    
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);

  // Navigation handlers are now handled internally by MobileAudioManager

  // We'll set up the end handler after nextTrack is defined

  const loadTrack = useCallback(async (track: Track) => {
    if (!audioManagerRef.current) return;

    try {
      console.log('Loading track:', track.title, 'from URL:', track.fileUrl);
      await audioManagerRef.current.loadTrack(track.fileUrl, {
        title: track.title,
        artist: track.artist,
        album: track.album || 'Unknown Album',
        artwork: track.albumArt || undefined
      });
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
      await audioManagerRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack, state.isPlaying, loadTrack]);

  // Media Session API is now handled by MediaSessionManager

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

  // Set up track end handler and navigation callbacks after nextTrack is defined
  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.onEnded(() => {
        nextTrack();
      });
      
      // Set navigation callbacks for media session controls
      audioManagerRef.current.setNavigationCallbacks(
        () => previousTrack(),
        () => nextTrack()
      );
    }
  }, [nextTrack, previousTrack]);

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

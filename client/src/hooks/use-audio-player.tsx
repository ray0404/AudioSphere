import { useState, useEffect, useRef, useCallback } from 'react';
import { MobileAudioManager } from '@/lib/mobile-audio-manager';
import { formatTime } from '@/lib/audio-utils';
import { Track } from '@shared/schema';
import { OfflineStorage } from '@/lib/offline-storage'; // ADDED

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
  const offlineStorageRef = useRef(new OfflineStorage()); // ADDED

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

  useEffect(() => {
    audioManagerRef.current = new MobileAudioManager();
    
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

  const loadTrack = useCallback(async (track: Track) => {
    if (!audioManagerRef.current) return;

    try {
      let audioUrl = track.fileUrl;

      // CHANGED: If the track is from the device, get its Blob from IndexedDB
      if (track.fileSource === 'device' || track.fileSource === 'local') {
        const audioBlob = await offlineStorageRef.current.getAudioBlob(track.id);
        if (audioBlob) {
          // Revoke old blob URL if it exists to prevent memory leaks
          if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          audioUrl = URL.createObjectURL(audioBlob);
        } else {
          throw new Error('Audio file not found in offline storage.');
        }
      }
      
      console.log('Loading track:', track.title, 'from URL:', audioUrl);
      
      await audioManagerRef.current.loadTrack(audioUrl, {
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
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // play, pause, and other functions remain the same...
  // The rest of the file is unchanged.
  const play = useCallback(async (track?: Track) => {
    if (!audioManagerRef.current) return;

    if (state.isPlaying) {
      audioManagerRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }

    if (track && (!state.currentTrack || track.id !== state.currentTrack.id)) {
      await loadTrack(track);
    }

    if (state.currentTrack || track) {
      await audioManagerRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.currentTrack, state.isPlaying, loadTrack]);

  const pause = useCallback(() => {
    if (!audioManagerRef.current) return;
    
    audioManagerRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play(state.currentTrack || undefined);
    }
  }, [state.isPlaying, state.currentTrack, play, pause]);

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
          return;
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

  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.onEnded(() => {
        nextTrack();
      });
      
      audioManagerRef.current.setNavigationCallbacks(
        () => previousTrack(),
        () => nextTrack()
      );
    }
  }, [nextTrack, previousTrack]);

  const playFromList = useCallback((sourceList: Track[], selectedIndex: number) => {
    if (selectedIndex < 0 || selectedIndex >= sourceList.length) return;
    
    const newPlayQueue = sourceList.slice(selectedIndex);
    
    setState(prev => ({
      ...prev,
      playlist: newPlayQueue,
      currentIndex: 0
    }));
    
    play(newPlayQueue[0]);
  }, [play]);

  return {
    ...state,
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
    playFromList,
    getFormattedTime,
    getProgress,
  };
}
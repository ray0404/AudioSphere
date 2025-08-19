import { createContext, useContext, ReactNode } from 'react';
import { useAudioPlayer } from '@/hooks/use-audio-player';

const AudioContext = createContext<ReturnType<typeof useAudioPlayer> | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioPlayer = useAudioPlayer();
  
  return (
    <AudioContext.Provider value={audioPlayer}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
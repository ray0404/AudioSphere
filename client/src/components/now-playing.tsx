import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react';
import { useAudioContext } from '@/contexts/audio-context';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NowPlayingProps {
  isOpen: boolean;
  onClose: () => void;
}

// Function to extract dominant colors from an image
const extractColorsFromImage = async (imageSrc: string): Promise<{ primary: string; secondary: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ primary: '#1a1a1a', secondary: '#2a2a2a' });
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);
      
      // Create darker variants for gradient
      const primary = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
      const secondary = `rgb(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)})`;
      
      resolve({ primary, secondary });
    };
    img.onerror = () => {
      resolve({ primary: '#1a1a1a', secondary: '#2a2a2a' });
    };
    img.src = imageSrc;
  });
};

export function NowPlaying({ isOpen, onClose }: NowPlayingProps) {
  const { 
    currentTrack, 
    isPlaying, 
    play, 
    pause, 
    previousTrack, 
    nextTrack, 
    currentTime, 
    duration,
    volume,
    setVolume,
    seekTo,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat
  } = useAudioContext();
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [colors, setColors] = useState({ primary: '#1a1a1a', secondary: '#2a2a2a' });
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Update progress based on current time
  useEffect(() => {
    if (!isDragging && duration > 0) {
      setProgress((currentTime / duration) * 100);
    }
  }, [currentTime, duration, isDragging]);

  // Extract colors from album art
  useEffect(() => {
    if (currentTrack?.albumArt) {
      extractColorsFromImage(currentTrack.albumArt).then(setColors);
    }
  }, [currentTrack?.albumArt]);

  // Handle swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const deltaY = e.touches[0].clientY - startY;
    setCurrentY(e.touches[0].clientY);
    
    if (deltaY > 0) {
      // Prevent pull-to-refresh when swiping down
      e.preventDefault();
      
      if (containerRef.current) {
        const opacity = Math.max(0.3, 1 - (deltaY / 300));
        const scale = Math.max(0.9, 1 - (deltaY / 1000));
        containerRef.current.style.transform = `translateY(${deltaY}px) scale(${scale})`;
        containerRef.current.style.opacity = opacity.toString();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const deltaY = currentY - startY;
    
    if (containerRef.current) {
      if (deltaY > 100) {
        onClose();
      } else {
        containerRef.current.style.transform = '';
        containerRef.current.style.opacity = '1';
      }
    }
    
    setStartY(0);
    setCurrentY(0);
  };

  const handleProgressChange = (values: number[]) => {
    setProgress(values[0]);
    setIsDragging(true);
  };

  const handleProgressCommit = (values: number[]) => {
    const newTime = (values[0] / 100) * duration;
    if (seekTo && duration > 0) {
      seekTo(newTime);
    }
    setIsDragging(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (values: number[]) => {
    if (setVolume) {
      setVolume(values[0] / 100);
    }
  };


  
  if (!currentTrack) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] transition-all duration-500 ease-out",
        isOpen 
          ? "translate-y-0 opacity-100" 
          : "translate-y-full opacity-0 pointer-events-none"
      )}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
      }}
    >
      <div
        ref={containerRef}
        className="h-full flex flex-col text-white overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-12 md:pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm opacity-70">Playing from Library</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Swipe indicator for mobile */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-4">
            <div className="w-12 h-1 bg-white/30 rounded-full" />
          </div>
        )}

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center px-8 md:px-16">
          <div className="relative w-full max-w-sm aspect-square">
            <img
              src={currentTrack.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400'}
              alt={currentTrack.title}
              className="w-full h-full object-cover rounded-2xl shadow-2xl"
            />
            {/* Vinyl record effect overlay */}
            <div className="absolute inset-0 rounded-2xl border border-white/10" />
          </div>
        </div>

        {/* Track Info */}
        <div className="px-8 md:px-16 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 truncate">
              {currentTrack.title}
            </h1>
            <p className="text-lg md:text-xl opacity-70 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <Slider
              value={[progress]}
              onValueChange={handleProgressChange}
              onValueCommit={handleProgressCommit}
              max={100}
              step={0.1}
              className="w-full [&>*]:bg-white/30 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50"
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-sm opacity-70 mb-8">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(duration - currentTime)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-8 mb-8">
            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                previousTrack();
                e.preventDefault();
              }}
              className="text-white hover:bg-white/10 p-3 rounded-lg transition-colors [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:bg-transparent"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <SkipBack className="w-8 h-8" fill="currentColor" />
            </button>

            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                isPlaying ? pause() : play(currentTrack);
                e.preventDefault();
              }}
              className="text-white hover:bg-white/10 p-4 bg-white/10 rounded-full transition-colors [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:bg-white/10"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isPlaying ? (
                <Pause className="w-10 h-10" fill="currentColor" />
              ) : (
                <Play className="w-10 h-10 ml-1" fill="currentColor" />
              )}
            </button>

            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                nextTrack();
                e.preventDefault();
              }}
              className="text-white hover:bg-white/10 p-3 rounded-lg transition-colors [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:bg-transparent"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <SkipForward className="w-8 h-8" fill="currentColor" />
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-between opacity-70">
            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                toggleShuffle();
                e.preventDefault();
              }}
              className={cn(
                "hover:bg-white/10 p-2 rounded-lg transition-colors [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:bg-transparent",
                shuffle ? "text-accent" : "text-white"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <Slider
                value={[Math.round((volume || 0.8) * 100)]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-24 [&>*]:bg-white/30 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50"
              />
            </div>

            <button
              tabIndex={-1}
              onMouseDown={(e) => {
                toggleRepeat();
                e.preventDefault();
              }}
              className={cn(
                "hover:bg-white/10 p-2 rounded-lg transition-colors [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:bg-transparent",
                repeat ? "text-accent" : "text-white"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Safe area for mobile */}
        <div className="h-12 md:h-8" />
      </div>
    </div>
  );
}
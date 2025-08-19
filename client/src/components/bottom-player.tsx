import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useIsMobile } from '@/hooks/use-mobile';

export function BottomPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    getFormattedTime,
    getProgress,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  if (isMobile) {
    return (
      <>
        {/* Compact Mobile Player */}
        {!isExpanded && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-secondary to-background border-t border-neutral/20 p-3 z-50">
            <div className="flex items-center space-x-3">
              <img
                src={currentTrack.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60'}
                alt={currentTrack.album || 'Album cover'}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
                <h4 className="text-white text-sm font-medium truncate">{currentTrack.title}</h4>
                <p className="text-neutral text-xs truncate">{currentTrack.artist}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/10"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2">
              <Slider
                value={[getProgress()]}
                onValueChange={handleSeek}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Expanded Mobile Player */}
        {isExpanded && (
          <div className="fixed inset-0 bg-gradient-to-b from-primary/20 to-background z-50 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="self-start mb-4 text-white"
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
              
              <img
                src={currentTrack.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300'}
                alt={currentTrack.album || 'Album cover'}
                className="w-72 h-72 rounded-lg object-cover shadow-2xl mb-8"
              />
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">{currentTrack.title}</h2>
                <p className="text-lg text-neutral">{currentTrack.artist}</p>
              </div>
              
              <div className="w-full mb-6">
                <Slider
                  value={[getProgress()]}
                  onValueChange={handleSeek}
                  max={100}
                  step={1}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-sm text-neutral">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-6 mb-6">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleShuffle}
                  className={cn("text-white", shuffle && "text-accent")}
                >
                  <Shuffle className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={previousTrack}
                  className="text-white"
                >
                  <SkipBack className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={togglePlayPause}
                  className="bg-white text-black hover:bg-white/90 rounded-full p-4"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={nextTrack}
                  className="text-white"
                >
                  <SkipForward className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleRepeat}
                  className={cn("text-white", repeat && "text-accent")}
                >
                  <Repeat className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 w-full max-w-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Player
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-secondary to-background border-t border-neutral/20 p-4 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <img
              src={currentTrack.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80'}
              alt={currentTrack.album || 'Album cover'}
              className="w-16 h-16 rounded object-cover shadow-lg"
            />
            <div className="min-w-0">
              <h4 className="text-white text-sm font-medium truncate">{currentTrack.title}</h4>
              <p className="text-neutral text-xs truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2 flex-1">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleShuffle}
                className={cn("text-white hover:bg-white/10", shuffle && "text-accent")}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={previousTrack}
                className="text-white hover:bg-white/10"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={togglePlayPause}
                className="bg-white text-black hover:bg-white/90 rounded-full"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextTrack}
                className="text-white hover:bg-white/10"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRepeat}
                className={cn("text-white hover:bg-white/10", repeat && "text-accent")}
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 w-full max-w-md">
              <span className="text-xs text-neutral min-w-[40px]">{formatTime(currentTime)}</span>
              <Slider
                value={[getProgress()]}
                onValueChange={handleSeek}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-neutral min-w-[40px]">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
import { Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, List, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { Slider } from '@/components/ui/slider';

export function BottomPlayer() {
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
    seekTo,
    setVolume,
    toggleMute,
    previousTrack,
    nextTrack,
    toggleShuffle,
    toggleRepeat,
    getFormattedTime,
    getProgress,
  } = useAudioPlayer();

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * duration;
    
    seekTo(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  if (!currentTrack) {
    return null;
  }

  const albumArtSrc = currentTrack.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=56&h=56';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-secondary/95 backdrop-blur-md border-t border-neutral/20 px-2 md:px-4 py-3 z-50">
      {/* Mobile Layout */}
      <div className="block md:hidden">
        {/* Progress Bar */}
        <div className="mb-3">
          <div 
            className="progress-bar group cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="progress-fill"
              style={{ width: `${getProgress()}%` }}
            >
              <div className="progress-thumb" />
            </div>
          </div>
        </div>
        
        {/* Track Info & Controls */}
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <img
              src={albumArtSrc}
              alt={`${currentTrack.album} by ${currentTrack.artist}`}
              className="w-12 h-12 rounded object-cover shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48';
              }}
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm text-white truncate" title={currentTrack.title}>
                {currentTrack.title}
              </h4>
              <p className="text-neutral text-xs truncate" title={currentTrack.artist}>
                {currentTrack.artist}
              </p>
            </div>
          </div>
          
          {/* Mobile Controls */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={previousTrack}
              className="text-neutral hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            
            <button 
              onClick={nextTrack}
              className="text-neutral hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        {/* Currently Playing Track Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <img
            src={albumArtSrc}
            alt={`${currentTrack.album} by ${currentTrack.artist}`}
            className="w-14 h-14 rounded object-cover shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=56&h=56';
            }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-white truncate" title={currentTrack.title}>
              {currentTrack.title}
            </h4>
            <p className="text-neutral text-xs truncate" title={currentTrack.artist}>
              {currentTrack.artist}
            </p>
          </div>
          <button className="text-neutral hover:text-white transition-colors">
            <Heart className="w-5 h-5" />
          </button>
        </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleShuffle}
            className={cn(
              "transition-colors",
              shuffle ? "text-accent" : "text-neutral hover:text-white"
            )}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          
          <button 
            onClick={previousTrack}
            className="text-neutral hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          
          <button 
            onClick={nextTrack}
            className="text-neutral hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          
          <button 
            onClick={toggleRepeat}
            className={cn(
              "transition-colors",
              repeat ? "text-accent" : "text-neutral hover:text-white"
            )}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center space-x-2 w-full">
          <span className="text-xs text-neutral min-w-[35px] text-right">
            {getFormattedTime(currentTime)}
          </span>
          
          <div 
            className="flex-1 progress-bar group cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="progress-fill"
              style={{ width: `${getProgress()}%` }}
            >
              <div className="progress-thumb" />
            </div>
          </div>
          
          <span className="text-xs text-neutral min-w-[35px]">
            {getFormattedTime(duration)}
          </span>
        </div>
      </div>

        {/* Volume and Additional Controls */}
        <div className="flex items-center space-x-4 flex-1 justify-end">
          <button className="text-neutral hover:text-white transition-colors">
            <List className="w-4 h-4" />
          </button>
          
          <button 
            onClick={toggleMute}
            className="text-neutral hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <div className="flex items-center space-x-2 w-24">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
          
          <button className="text-neutral hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

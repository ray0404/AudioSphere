import { Track } from '@shared/schema';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  className?: string;
}

export function TrackCard({ track, isPlaying, onPlay, className }: TrackCardProps) {
  const isMobile = useIsMobile();
  
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scroll interference on mobile
    if (isMobile && e.type === 'touchend') {
      e.preventDefault();
    }
    onPlay(track);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-all group track-card",
        isPlaying && "bg-accent/20 border border-accent/50",
        className
      )}
      onClick={handleClick}
      onTouchEnd={isMobile ? handleClick : undefined}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <div className="relative mb-3">
        <img
          src={track.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'}
          alt={track.album || 'Album cover'}
          className="w-full aspect-square object-cover rounded-lg shadow-lg"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2">
          <button 
            className={cn(
              "w-8 h-8 bg-primary rounded-full flex items-center justify-center transition-all",
              isPlaying ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(e);
            }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        <h4 className="font-medium text-white truncate text-sm">{track.title}</h4>
        <p className="text-neutral text-xs truncate">{track.artist}</p>
        {!isMobile && (
          <div className="flex items-center justify-between text-xs text-neutral">
            <span className="truncate max-w-[60%]">{track.album || 'Unknown Album'}</span>
            <span>{formatDuration(track.duration || 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
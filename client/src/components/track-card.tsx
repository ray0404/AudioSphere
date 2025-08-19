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
  
  const handleClick = () => {
    onPlay(track);
  };

  const albumArtSrc = track.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200';

  return (
    <div
      className={cn(
        "track-card bg-secondary/40 rounded-lg cursor-pointer group relative",
        isMobile ? "p-3" : "p-4",
        className
      )}
      onClick={handleClick}
    >
      {/* Album Art */}
      <div className="relative mb-3">
        <img
          src={albumArtSrc}
          alt={`${track.album} by ${track.artist}`}
          className="w-full aspect-square object-cover rounded-lg shadow-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200';
          }}
        />
        
        {/* Play Button Overlay */}
        <div className={cn(
          "play-button absolute",
          isMobile ? "bottom-1 right-1" : "bottom-2 right-2"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
            className={cn(
              "bg-primary rounded-full flex items-center justify-center shadow-lg transition-all",
              "hover:scale-105 hover:bg-primary/90",
              isMobile ? "w-8 h-8" : "w-10 h-10",
              isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isPlaying ? (
              <Pause className={cn("text-white", isMobile ? "w-3 h-3" : "w-4 h-4")} />
            ) : (
              <Play className={cn("text-white ml-0.5", isMobile ? "w-3 h-3" : "w-4 h-4")} />
            )}
          </button>
        </div>
      </div>

      {/* Track Info */}
      <div className="space-y-1">
        <h4 className={cn(
          "font-medium text-white truncate",
          isMobile ? "text-xs" : "text-sm"
        )} title={track.title}>
          {track.title}
        </h4>
        <p className="text-neutral text-xs truncate" title={track.artist}>
          {track.artist}
        </p>
        {track.album && !isMobile && (
          <p className="text-neutral text-xs truncate" title={track.album}>
            {track.album}
          </p>
        )}
      </div>

      {/* Duration */}
      {track.duration && (
        <div className="mt-2">
          <p className="text-neutral text-xs">
            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
          </p>
        </div>
      )}
    </div>
  );
}

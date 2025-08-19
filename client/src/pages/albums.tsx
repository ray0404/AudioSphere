import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Disc, Music, Play, Pause } from 'lucide-react';
import { Track } from '@shared/schema';
import { useAudioContext } from '@/contexts/audio-context';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface Album {
  name: string;
  artist: string;
  albumArt?: string;
  tracks: Track[];
}

export default function Albums() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const isMobile = useIsMobile();
  
  const { currentTrack, isPlaying, play } = useAudioContext();
  
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  // Group tracks by album
  const albums = tracks.reduce((acc, track) => {
    const albumName = track.album || 'Unknown Album';
    const artistName = track.artist || 'Unknown Artist';
    const albumKey = `${albumName}-${artistName}`;
    
    if (!acc[albumKey]) {
      acc[albumKey] = {
        name: albumName,
        artist: artistName,
        albumArt: track.albumArt || undefined,
        tracks: []
      };
    }
    
    acc[albumKey].tracks.push(track);
    
    return acc;
  }, {} as Record<string, Album>);

  // Convert to array and sort
  const albumsArray: Album[] = Object.values(albums)
    .sort((a, b) => {
      // Sort by album name first, then by artist
      const albumCompare = a.name.localeCompare(b.name);
      if (albumCompare !== 0) return albumCompare;
      return a.artist.localeCompare(b.artist);
    });

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
  };

  const handleTrackPlay = (track: Track) => {
    play(track);
  };

  const handlePlayAlbum = (album: Album) => {
    if (album.tracks.length > 0) {
      play(album.tracks[0]);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Albums</h1>
          <p className="text-neutral">Browse music by album</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-secondary/40 p-3 md:p-4 rounded-lg animate-pulse">
                <div className="w-full aspect-square bg-neutral/30 rounded-lg mb-3" />
                <div className="h-4 bg-neutral/30 rounded mb-2" />
                <div className="h-3 bg-neutral/30 rounded w-2/3" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Album songs view
  if (selectedAlbum) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToAlbums}
              className="text-neutral hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Albums
            </Button>
          </div>
          
          <div className="flex items-start space-x-4">
            <img
              src={selectedAlbum.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'}
              alt={selectedAlbum.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-lg shadow-lg object-cover"
            />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedAlbum.name}</h1>
              <p className="text-lg text-neutral mb-2">by {selectedAlbum.artist}</p>
              <p className="text-sm text-neutral">{selectedAlbum.tracks.length} track{selectedAlbum.tracks.length !== 1 ? 's' : ''}</p>
              <Button
                className="mt-4"
                onClick={() => handlePlayAlbum(selectedAlbum)}
              >
                <Play className="w-4 h-4 mr-2" />
                Play Album
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
          <div className="space-y-2">
            {selectedAlbum.tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors group"
                onClick={() => handleTrackPlay(track)}
              >
                <div className="flex items-center justify-center w-8 h-8 mr-4 text-neutral group-hover:text-white">
                  {isPlaying && currentTrack?.id === track.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">{track.title}</h4>
                  {track.duration && (
                    <p className="text-sm text-neutral">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
                {isPlaying && currentTrack?.id === track.id && (
                  <div className="w-4 h-4 ml-4">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-1 h-4 bg-accent animate-pulse" />
                      <div className="w-1 h-2 bg-accent animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1 h-3 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Main albums view
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Albums</h1>
        <p className="text-neutral">Browse music by album</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
        {albumsArray.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {albumsArray.map((album) => (
              <div
                key={`${album.name}-${album.artist}`}
                className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors group"
                onClick={() => handleAlbumClick(album)}
              >
                <div className="relative mb-3">
                  <img
                    src={album.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'}
                    alt={album.name}
                    className="w-full aspect-square object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute bottom-2 right-2">
                    <button 
                      className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAlbum(album);
                      }}
                    >
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-medium text-white truncate text-sm mb-1">{album.name}</h4>
                <p className="text-neutral text-xs truncate">{album.artist}</p>
                <p className="text-neutral text-xs">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Disc className="w-16 h-16 text-neutral mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No albums found</h3>
            <p className="text-neutral">Upload some music files to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}
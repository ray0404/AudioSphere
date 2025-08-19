import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Grid, List, Music, User, Disc } from 'lucide-react';
import { Track } from '@shared/schema';
import { useAudioContext } from '@/contexts/audio-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackCard } from '@/components/track-card';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isMobile = useIsMobile();
  
  const { currentTrack, isPlaying, play, setPlaylist } = useAudioContext();
  
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTrackPlay = (track: Track) => {
    play(track);
  };

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (track.album || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tracks by different categories
  const recentlyPlayed = tracks.slice(0, 10);
  const albums = tracks.reduce((acc, track) => {
    const albumKey = `${track.album}-${track.artist}`;
    if (!acc[albumKey]) {
      acc[albumKey] = {
        name: track.album || 'Unknown Album',
        artist: track.artist,
        albumArt: track.albumArt || undefined,
        tracks: []
      };
    }
    acc[albumKey].tracks.push(track);
    return acc;
  }, {} as Record<string, { name: string; artist: string; albumArt?: string; tracks: Track[] }>);

  const artists = tracks.reduce((acc, track) => {
    if (!acc[track.artist]) {
      acc[track.artist] = {
        name: track.artist,
        tracks: []
      };
    }
    acc[track.artist].tracks.push(track);
    return acc;
  }, {} as Record<string, { name: string; tracks: Track[] }>);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Your Library</h1>
            <p className="text-neutral">All your music in one place</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search your library..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 bg-white/10 border-neutral/30 text-white placeholder-neutral focus:border-accent focus:bg-white/20"
                />
              </div>
            </div>
            
            {!isMobile && (
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Music</TabsTrigger>
            <TabsTrigger value="recent">Recently Played</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {searchQuery && (
              <div className="mb-4">
                <p className="text-neutral">
                  {filteredTracks.length} result{filteredTracks.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              </div>
            )}
            
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-secondary/40 p-3 md:p-4 rounded-lg animate-pulse">
                    <div className="w-full aspect-square bg-neutral/30 rounded-lg mb-3" />
                    <div className="h-3 md:h-4 bg-neutral/30 rounded mb-2" />
                    <div className="h-2 md:h-3 bg-neutral/30 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredTracks.length > 0 ? (
              <div className={`grid gap-3 md:gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
                  : 'grid-cols-1'
              }`}>
                {filteredTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={handleTrackPlay}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-neutral mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No music found</h3>
                <p className="text-neutral">Upload some music files to get started</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {recentlyPlayed.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onPlay={handleTrackPlay}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="albums">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {Object.values(albums).map((album) => (
                <div
                  key={`${album.name}-${album.artist}`}
                  className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors"
                  onClick={() => handleTrackPlay(album.tracks[0])}
                >
                  <div className="relative mb-3">
                    <img
                      src={album.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'}
                      alt={album.name}
                      className="w-full aspect-square object-cover rounded-lg shadow-lg"
                    />
                    <div className="absolute bottom-2 right-2">
                      <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Disc className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-white truncate text-sm">{album.name || 'Unknown Album'}</h4>
                  <p className="text-neutral text-xs truncate">{album.artist || 'Unknown Artist'}</p>
                  <p className="text-neutral text-xs">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="artists">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {Object.values(artists).map((artist) => (
                <div
                  key={artist.name}
                  className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors"
                  onClick={() => handleTrackPlay(artist.tracks[0])}
                >
                  <div className="relative mb-3">
                    <div className="w-full aspect-square bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h4 className="font-medium text-white truncate text-sm">{artist.name || 'Unknown Artist'}</h4>
                  <p className="text-neutral text-xs">{artist.tracks.length} track{artist.tracks.length !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
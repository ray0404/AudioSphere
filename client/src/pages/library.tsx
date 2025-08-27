import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid, List, Music } from 'lucide-react';
import { Track } from '@shared/schema';
import { useAudioContext } from '@/contexts/audio-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrackCard } from '@/components/track-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { OfflineStorage } from '@/lib/offline-storage';

// CHANGED: Instantiate offline storage
const offlineStorage = new OfflineStorage();

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isMobile = useIsMobile();
  
  const { currentTrack, isPlaying, playFromList } = useAudioContext();
  
  // CHANGED: Query now fetches from IndexedDB via OfflineStorage
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['local-tracks'], // Use a local-specific key
    queryFn: () => offlineStorage.getTracks(),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTrackPlay = (track: Track) => {
    const trackIndex = filteredTracks.findIndex(t => t.id === track.id);
    if (trackIndex !== -1) {
      playFromList(filteredTracks, trackIndex);
    }
  };

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (track.album || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
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
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
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
                onPlay={() => handleTrackPlay(track)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-neutral mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No music in your library</h3>
            <p className="text-neutral">Use the sidebar to scan your device for music.</p>
          </div>
        )}
      </main>
    </div>
  );
}
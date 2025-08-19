import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, TrendingUp, Music, User, Disc } from 'lucide-react';
import { Track } from '@shared/schema';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { TrackCard } from '@/components/track-card';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  const { currentTrack, isPlaying, play } = useAudioPlayer();
  
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('music-search-history');
    if (stored) {
      setSearchHistory(JSON.parse(stored));
    }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
      const newHistory = [query.trim(), ...searchHistory.slice(0, 9)]; // Keep last 10 searches
      setSearchHistory(newHistory);
      localStorage.setItem('music-search-history', JSON.stringify(newHistory));
    }
  };

  const handleTrackPlay = (track: Track) => {
    play(track);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('music-search-history');
  };

  // Filter tracks based on search query
  const filteredTracks = searchQuery 
    ? tracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Group results by type
  const trackResults = filteredTracks;
  const artistResults = Array.from(new Set(filteredTracks.map(t => t.artist)))
    .map(artist => ({
      name: artist || 'Unknown Artist',
      tracks: filteredTracks.filter(t => t.artist === artist)
    }));
  const albumResults = Array.from(new Set(filteredTracks.map(t => `${t.album || 'Unknown Album'}-${t.artist || 'Unknown Artist'}`)))
    .map(albumKey => {
      const [album, artist] = albumKey.split('-');
      const albumTracks = filteredTracks.filter(t => (t.album || 'Unknown Album') === album && (t.artist || 'Unknown Artist') === artist);
      return {
        name: album || 'Unknown Album',
        artist: artist || 'Unknown Artist',
        albumArt: albumTracks[0]?.albumArt,
        tracks: albumTracks
      };
    });

  // Popular/trending tracks (most recently added)
  const popularTracks = tracks
    .sort((a, b) => new Date(b.metadata?.uploadDate || 0).getTime() - new Date(a.metadata?.uploadDate || 0).getTime())
    .slice(0, 12);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with Search Bar */}
      <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center md:text-left">Search</h1>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral w-5 h-5" />
            <Input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={handleSearch}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
              className="pl-12 pr-4 py-3 text-lg bg-white/10 border-neutral/30 text-white placeholder-neutral focus:border-accent focus:bg-white/20 rounded-full"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
        {!searchQuery ? (
          /* Default Search State */
          <div className="max-w-6xl mx-auto">
            {/* Search History */}
            {searchHistory.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Recent searches</h2>
                  <button
                    onClick={clearSearchHistory}
                    className="text-neutral hover:text-white text-sm transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(query)}
                      className="flex items-center space-x-2 bg-secondary/40 hover:bg-secondary/60 px-3 py-2 rounded-full transition-colors"
                    >
                      <Clock className="w-4 h-4 text-neutral" />
                      <span className="text-white text-sm">{query}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Browse Categories */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Browse all</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Recently played', icon: Clock, color: 'from-green-500 to-green-700' },
                  { name: 'Your top mixes', icon: TrendingUp, color: 'from-purple-500 to-purple-700' },
                  { name: 'Rock', icon: Music, color: 'from-red-500 to-red-700' },
                  { name: 'Pop', icon: Music, color: 'from-pink-500 to-pink-700' },
                  { name: 'Hip-Hop', icon: Music, color: 'from-yellow-500 to-yellow-700' },
                  { name: 'Electronic', icon: Music, color: 'from-blue-500 to-blue-700' },
                  { name: 'Jazz', icon: Music, color: 'from-indigo-500 to-indigo-700' },
                  { name: 'Classical', icon: Music, color: 'from-gray-500 to-gray-700' },
                ].map((category) => (
                  <div
                    key={category.name}
                    className={`bg-gradient-to-br ${category.color} p-4 rounded-lg cursor-pointer hover:scale-105 transition-transform`}
                    onClick={() => setSearchQuery(category.name.toLowerCase())}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{category.name}</h3>
                      <category.icon className="w-6 h-6 text-white/80" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Popular/Trending */}
            {popularTracks.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Popular right now</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {popularTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      onPlay={handleTrackPlay}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Search Results */
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                <p className="text-neutral mt-2">Searching...</p>
              </div>
            ) : filteredTracks.length > 0 ? (
              <div className="space-y-8">
                {/* Top Result */}
                {trackResults.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-white mb-4">Top result</h2>
                    <div className="bg-secondary/40 p-6 rounded-lg flex items-center space-x-4 hover:bg-secondary/60 transition-colors cursor-pointer max-w-md"
                         onClick={() => handleTrackPlay(trackResults[0])}>
                      <img
                        src={trackResults[0].albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80'}
                        alt={trackResults[0].album || 'Album cover'}
                        className="w-20 h-20 rounded object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-white text-lg">{trackResults[0].title}</h3>
                        <p className="text-neutral">{trackResults[0].artist}</p>
                        <p className="text-neutral text-sm">Song</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Songs */}
                {trackResults.length > 1 && (
                  <section>
                    <h2 className="text-xl font-bold text-white mb-4">Songs</h2>
                    <div className="space-y-2">
                      {trackResults.slice(1, 6).map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center space-x-4 p-2 rounded hover:bg-secondary/40 transition-colors cursor-pointer"
                          onClick={() => handleTrackPlay(track)}
                        >
                          <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-neutral text-sm">
                            {index + 2}
                          </div>
                          <img
                            src={track.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40'}
                            alt={track.album || 'Album cover'}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{track.title}</h4>
                            <p className="text-neutral text-sm truncate">{track.artist}</p>
                          </div>
                          <p className="text-neutral text-sm">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Artists */}
                {artistResults.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-white mb-4">Artists</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {artistResults.slice(0, 6).map((artist) => (
                        <div
                          key={artist.name}
                          className="text-center cursor-pointer group"
                          onClick={() => handleTrackPlay(artist.tracks[0])}
                        >
                          <div className="w-full aspect-square bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                            <User className="w-8 h-8 text-white" />
                          </div>
                          <h4 className="font-medium text-white truncate">{artist.name}</h4>
                          <p className="text-neutral text-sm">Artist</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Albums */}
                {albumResults.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {albumResults.slice(0, 6).map((album) => (
                        <div
                          key={`${album.name}-${album.artist}`}
                          className="cursor-pointer group"
                          onClick={() => handleTrackPlay(album.tracks[0])}
                        >
                          <div className="relative mb-2">
                            <img
                              src={album.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'}
                              alt={album.name || 'Album cover'}
                              className="w-full aspect-square object-cover rounded group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h4 className="font-medium text-white truncate">{album.name}</h4>
                          <p className="text-neutral text-sm truncate">{album.artist}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-neutral mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
                <p className="text-neutral">Try searching for something else</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
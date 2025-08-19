import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, User } from 'lucide-react';
import { Track } from '@shared/schema';
import { TrackCard } from '@/components/track-card';
import { UploadArea } from '@/components/upload-area';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useGoogleDrive } from '@/hooks/use-google-drive';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { queryClient } from '@/lib/queryClient';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { 
    currentTrack, 
    isPlaying, 
    play, 
    setPlaylist 
  } = useAudioPlayer();
  
  const { 
    isConnected: isGoogleDriveConnected, 
    loadGoogleDriveFiles 
  } = useGoogleDrive();

  // Fetch all tracks
  const { data: tracks = [], isLoading, refetch } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  // Search tracks
  const { data: searchResults = [] } = useQuery<Track[]>({
    queryKey: ['/api/tracks/search', { q: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  const displayTracks = searchQuery ? searchResults : tracks;

  // PWA Installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "App Installed",
        description: "SoundWave has been installed on your device!",
      });
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      return; // Already playing this track
    }
    
    // Set playlist and play
    setPlaylist(displayTracks, displayTracks.findIndex(t => t.id === track.id));
    play(track);
  };

  const handleUploadComplete = () => {
    // Refresh tracks data after upload
    queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
    // Also refresh the query immediately to show new tracks
    queryClient.refetchQueries({ queryKey: ['/api/tracks'] });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const recentTracks = tracks.slice(0, 8);
  const topMixes = tracks.slice(0, 6);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center space-x-4">
              <button className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-0 md:mx-8">
            <Input
              type="text"
              placeholder={isMobile ? "Search music..." : "Search for songs, artists, or albums..."}
              value={searchQuery}
              onChange={handleSearch}
              className="bg-white/10 border-neutral/30 text-white placeholder-neutral focus:border-accent focus:bg-white/20 w-full"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end space-x-4">
            {/* PWA Install Button */}
            {showInstallPrompt && (
              <Button
                onClick={handleInstallPWA}
                className="bg-accent text-black hover:bg-accent/90"
                size={isMobile ? "sm" : "default"}
              >
                <Download className="w-4 h-4 mr-2" />
                {isMobile ? "Install" : "Install App"}
              </Button>
            )}
            
            {/* User Profile */}
            <div className="w-8 h-8 bg-neutral rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-24 mobile-optimized">
        {searchQuery ? (
          /* Search Results */
          <section>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Search Results for "{searchQuery}"
            </h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {searchResults.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={handleTrackPlay}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-neutral text-lg">No tracks found for "{searchQuery}"</p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Greeting */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">Good evening</h2>
              
              {tracks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {tracks.slice(0, 6).map((track) => (
                    <div
                      key={track.id}
                      className="bg-neutral/20 rounded-lg p-3 md:p-4 flex items-center space-x-3 md:space-x-4 hover:bg-neutral/30 transition-colors cursor-pointer group"
                      onClick={() => handleTrackPlay(track)}
                    >
                      <img
                        src={track.albumArt || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80'}
                        alt={track.album || 'Album cover'}
                        className="w-10 h-10 md:w-12 md:h-12 rounded object-cover shadow-lg"
                      />
                      <span className="font-medium text-white truncate flex-1 text-sm md:text-base">
                        {track.title}
                      </span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackPlay(track);
                          }}
                          className="w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          <div className="w-2 h-2 md:w-3 md:h-3 border-l-2 md:border-l-4 border-l-white border-y border-y-transparent md:border-y-2 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Area */}
            <UploadArea onUploadComplete={handleUploadComplete} />

            {/* Recently Played */}
            {recentTracks.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Recently played</h3>
                  <button className="text-neutral hover:text-white text-sm font-medium">
                    Show all
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                  {recentTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isPlaying={currentTrack?.id === track.id && isPlaying}
                      onPlay={handleTrackPlay}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Your Top Mixes */}
            {topMixes.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Your top mixes</h3>
                  <button className="text-neutral hover:text-white text-sm font-medium">
                    Show all
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {topMixes.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isPlaying={currentTrack?.id === track.id && isPlaying}
                      onPlay={handleTrackPlay}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {tracks.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <h3 className="text-xl font-bold text-white mb-4">No music yet</h3>
                <p className="text-neutral mb-6">
                  Upload some music files or connect your Google Drive to get started!
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-secondary/40 p-3 md:p-4 rounded-lg animate-pulse">
                    <div className="w-full aspect-square bg-neutral/30 rounded-lg mb-3" />
                    <div className="h-3 md:h-4 bg-neutral/30 rounded mb-2" />
                    <div className="h-2 md:h-3 bg-neutral/30 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

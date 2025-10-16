import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid, List, Music, ArrowLeft, User, Disc, Play, Pause } from 'lucide-react';
import { Track } from '@shared/schema';
import { useAudioContext } from '@/contexts/audio-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrackCard } from '@/components/track-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { OfflineStorage } from '@/lib/offline-storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const offlineStorage = new OfflineStorage();

// #region Artists Components
interface Artist {
  name: string;
  trackCount: number;
  albums: Album[];
}

interface Album {
  name: string;
  artist: string;
  albumArt?: string;
  tracks: Track[];
}

const ArtistsView = ({ tracks }: { tracks: Track[] }) => {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const { currentTrack, isPlaying, play, playFromList } = useAudioContext();

  const artistsArray: Artist[] = useMemo(() => {
    const artists = tracks.reduce((acc, track) => {
      const artistName = track.artist || 'Unknown Artist';
      if (!acc[artistName]) {
        acc[artistName] = { name: artistName, trackCount: 0, albums: {} };
      }
      acc[artistName].trackCount++;
      const albumName = track.album || 'Unknown Album';
      if (!acc[artistName].albums[albumName]) {
        acc[artistName].albums[albumName] = {
          name: albumName,
          artist: artistName,
          albumArt: track.albumArt || undefined,
          tracks: []
        };
      }
      acc[artistName].albums[albumName].tracks.push(track);
      return acc;
    }, {} as Record<string, { name: string; trackCount: number; albums: Record<string, Album> }>);

    return Object.values(artists)
      .map(artist => ({
        ...artist,
        albums: Object.values(artist.albums).sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const handleArtistClick = (artist: Artist) => {
    setSelectedArtist(artist);
    setSelectedAlbum(null);
  };

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBackToArtists = () => {
    setSelectedArtist(null);
    setSelectedAlbum(null);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
  };

  const handleTrackPlay = (track: Track) => {
    if (selectedAlbum) {
      const trackIndex = selectedAlbum.tracks.findIndex(t => t.id === track.id);
      if (trackIndex !== -1) {
        playFromList(selectedAlbum.tracks, trackIndex);
        return;
      }
    }
    play(track);
  };

  const handlePlayAlbum = (album: Album) => {
    if (album.tracks.length > 0) {
      playFromList(album.tracks, 0);
    }
  };

  if (selectedAlbum) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={handleBackToAlbums} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Albums
        </Button>
        <div className="flex items-start space-x-4 mb-4">
          <img src={selectedAlbum.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'} alt={selectedAlbum.name} className="w-24 h-24 md:w-32 md:h-32 rounded-lg shadow-lg object-cover" />
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedAlbum.name}</h2>
            <p className="text-lg text-neutral mb-2">by {selectedAlbum.artist}</p>
            <p className="text-sm text-neutral">{selectedAlbum.tracks.length} track{selectedAlbum.tracks.length !== 1 ? 's' : ''}</p>
            <Button className="mt-4" onClick={() => handlePlayAlbum(selectedAlbum)}>
              <Play className="w-4 h-4 mr-2" />
              Play Album
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {selectedAlbum.tracks.map((track, index) => (
            <div key={track.id} className="flex items-center p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors group" onClick={() => handleTrackPlay(track)}>
              <div className="flex items-center justify-center w-8 h-8 mr-4 text-neutral group-hover:text-white">
                {isPlaying && currentTrack?.id === track.id ? <Pause className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{track.title}</h4>
                {track.duration && <p className="text-sm text-neutral">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</p>}
              </div>
              {isPlaying && currentTrack?.id === track.id && <div className="w-4 h-4 ml-4"><div className="flex items-center justify-center space-x-1"><div className="w-1 h-4 bg-accent animate-pulse" /><div className="w-1 h-2 bg-accent animate-pulse" style={{ animationDelay: '0.1s' }} /><div className="w-1 h-3 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} /></div></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedArtist) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={handleBackToArtists} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Artists
        </Button>
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedArtist.name}</h2>
            <p className="text-neutral">{selectedArtist.trackCount} track{selectedArtist.trackCount !== 1 ? 's' : ''} • {selectedArtist.albums.length} album{selectedArtist.albums.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-4">Albums</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {selectedArtist.albums.map((album) => (
            <div key={`${album.name}-${album.artist}`} className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors group" onClick={() => handleAlbumClick(album)}>
              <div className="relative mb-3">
                <img src={album.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'} alt={album.name} className="w-full aspect-square object-cover rounded-lg shadow-lg" />
                <div className="absolute bottom-2 right-2">
                  <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album); }}>
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </button>
                </div>
              </div>
              <h4 className="font-medium text-white truncate text-sm mb-1">{album.name}</h4>
              <p className="text-neutral text-xs">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
      {artistsArray.map((artist) => (
        <div key={artist.name} className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => handleArtistClick(artist)}>
          <div className="relative mb-3">
            <div className="w-full aspect-square bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h4 className="font-medium text-white truncate text-sm">{artist.name}</h4>
          <p className="text-neutral text-xs">{artist.trackCount} track{artist.trackCount !== 1 ? 's' : ''}</p>
          <p className="text-neutral text-xs">{artist.albums.length} album{artist.albums.length !== 1 ? 's' : ''}</p>
        </div>
      ))}
    </div>
  );
};
// #endregion

// #region Albums Components
const AlbumsView = ({ tracks }: { tracks: Track[] }) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const { currentTrack, isPlaying, play, playFromList } = useAudioContext();

  const albumsArray: Album[] = useMemo(() => {
    const albums = tracks.reduce((acc, track) => {
      const albumName = track.album || 'Unknown Album';
      const artistName = track.artist || 'Unknown Artist';
      const albumKey = `${albumName}-${artistName}`;
      if (!acc[albumKey]) {
        acc[albumKey] = { name: albumName, artist: artistName, albumArt: track.albumArt || undefined, tracks: [] };
      }
      acc[albumKey].tracks.push(track);
      return acc;
    }, {} as Record<string, Album>);

    return Object.values(albums).sort((a, b) => {
      const albumCompare = a.name.localeCompare(b.name);
      if (albumCompare !== 0) return albumCompare;
      return a.artist.localeCompare(b.artist);
    });
  }, [tracks]);

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
  };

  const handleTrackPlay = (track: Track) => {
    if (selectedAlbum) {
      const trackIndex = selectedAlbum.tracks.findIndex(t => t.id === track.id);
      if (trackIndex !== -1) {
        playFromList(selectedAlbum.tracks, trackIndex);
        return;
      }
    }
    play(track);
  };

  const handlePlayAlbum = (album: Album) => {
    if (album.tracks.length > 0) {
      playFromList(album.tracks, 0);
    }
  };

  if (selectedAlbum) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={handleBackToAlbums} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Albums
        </Button>
        <div className="flex items-start space-x-4 mb-4">
          <img src={selectedAlbum.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'} alt={selectedAlbum.name} className="w-24 h-24 md:w-32 md:h-32 rounded-lg shadow-lg object-cover" />
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{selectedAlbum.name}</h2>
            <p className="text-lg text-neutral mb-2">by {selectedAlbum.artist}</p>
            <p className="text-sm text-neutral">{selectedAlbum.tracks.length} track{selectedAlbum.tracks.length !== 1 ? 's' : ''}</p>
            <Button className="mt-4" onClick={() => handlePlayAlbum(selectedAlbum)}>
              <Play className="w-4 h-4 mr-2" />
              Play Album
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {selectedAlbum.tracks.map((track, index) => (
            <div key={track.id} className="flex items-center p-3 rounded-lg hover:bg-secondary/40 cursor-pointer transition-colors group" onClick={() => handleTrackPlay(track)}>
              <div className="flex items-center justify-center w-8 h-8 mr-4 text-neutral group-hover:text-white">
                {isPlaying && currentTrack?.id === track.id ? <Pause className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{track.title}</h4>
                {track.duration && <p className="text-sm text-neutral">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</p>}
              </div>
              {isPlaying && currentTrack?.id === track.id && <div className="w-4 h-4 ml-4"><div className="flex items-center justify-center space-x-1"><div className="w-1 h-4 bg-accent animate-pulse" /><div className="w-1 h-2 bg-accent animate-pulse" style={{ animationDelay: '0.1s' }} /><div className="w-1 h-3 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} /></div></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
      {albumsArray.map((album) => (
        <div key={`${album.name}-${album.artist}`} className="bg-secondary/40 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors group" onClick={() => handleAlbumClick(album)}>
          <div className="relative mb-3">
            <img src={album.albumArt || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200'} alt={album.name} className="w-full aspect-square object-cover rounded-lg shadow-lg" />
            <div className="absolute bottom-2 right-2">
              <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album); }}>
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
  );
};
// #endregion

// #region Tracks Component
const TracksView = ({ tracks }: { tracks: Track[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const isMobile = useIsMobile();
  const { currentTrack, isPlaying, playFromList } = useAudioContext();

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
    <div>
      <div className="flex items-center space-x-4 mb-4">
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
      {filteredTracks.length > 0 ? (
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
          <h3 className="text-xl font-medium text-white mb-2">No matching tracks</h3>
          <p className="text-neutral">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};
// #endregion

export default function Library() {
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['local-tracks'],
    queryFn: () => offlineStorage.getTracks(),
  });

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-gradient-to-b from-secondary to-background p-4 md:p-6 border-b border-neutral/20">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Your Library</h1>
        <p className="text-neutral">All your music in one place</p>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 mobile-optimized">
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
          </TabsList>
          <TabsContent value="tracks">
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
            ) : tracks.length > 0 ? (
              <TracksView tracks={tracks} />
            ) : (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-neutral mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No music in your library</h3>
                <p className="text-neutral">Use the sidebar to scan your device for music.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="artists">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-secondary/40 p-3 md:p-4 rounded-lg animate-pulse">
                    <div className="w-full aspect-square bg-neutral/30 rounded-full mb-3" />
                    <div className="h-4 bg-neutral/30 rounded mb-2" />
                    <div className="h-3 bg-neutral/30 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : tracks.length > 0 ? (
              <ArtistsView tracks={tracks} />
            ) : (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-neutral mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No artists found</h3>
                <p className="text-neutral">Upload some music files to get started</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="albums">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-secondary/40 p-3 md:p-4 rounded-lg animate-pulse">
                    <div className="w-full aspect-square bg-neutral/30 rounded-lg mb-3" />
                    <div className="h-4 bg-neutral/30 rounded mb-2" />
                    <div className="h-3 bg-neutral/30 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : tracks.length > 0 ? (
              <AlbumsView tracks={tracks} />
            ) : (
              <div className="text-center py-12">
                <Disc className="w-16 h-16 text-neutral mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No albums found</h3>
                <p className="text-neutral">Upload some music files to get started</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

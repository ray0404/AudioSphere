import { type Track, type InsertTrack, type Playlist, type InsertPlaylist, type UserPreferences, type InsertUserPreferences } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Tracks
  getTrack(id: string): Promise<Track | undefined>;
  getAllTracks(): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrack(id: string, track: Partial<InsertTrack>): Promise<Track | undefined>;
  deleteTrack(id: string): Promise<boolean>;
  searchTracks(query: string): Promise<Track[]>;
  
  // Playlists
  getPlaylist(id: string): Promise<Playlist | undefined>;
  getAllPlaylists(): Promise<Playlist[]>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, playlist: Partial<InsertPlaylist>): Promise<Playlist | undefined>;
  deletePlaylist(id: string): Promise<boolean>;
  
  // User Preferences
  getUserPreferences(): Promise<UserPreferences | undefined>;
  updateUserPreferences(preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
}

export class MemStorage implements IStorage {
  private tracks: Map<string, Track>;
  private playlists: Map<string, Playlist>;
  private userPreferences: UserPreferences | undefined;

  constructor() {
    this.tracks = new Map();
    this.playlists = new Map();
    this.initializeDefaultPlaylists();
  }

  private initializeDefaultPlaylists() {
    const recentlyPlayed: Playlist = {
      id: "recently-played",
      name: "Recently Played",
      description: "Your recently played tracks",
      trackIds: [],
      isSystem: true,
      createdAt: new Date(),
    };
    
    const likedSongs: Playlist = {
      id: "liked-songs",
      name: "Liked Songs",
      description: "Your favorite tracks",
      trackIds: [],
      isSystem: true,
      createdAt: new Date(),
    };

    this.playlists.set(recentlyPlayed.id, recentlyPlayed);
    this.playlists.set(likedSongs.id, likedSongs);
  }

  // Tracks
  async getTrack(id: string): Promise<Track | undefined> {
    return this.tracks.get(id);
  }

  async getAllTracks(): Promise<Track[]> {
    return Array.from(this.tracks.values());
  }

  async createTrack(insertTrack: InsertTrack): Promise<Track> {
    const id = randomUUID();
    const track: Track = { ...insertTrack, id, createdAt: new Date() };
    this.tracks.set(id, track);
    return track;
  }

  async updateTrack(id: string, trackUpdate: Partial<InsertTrack>): Promise<Track | undefined> {
    const existingTrack = this.tracks.get(id);
    if (!existingTrack) return undefined;
    
    const updatedTrack = { ...existingTrack, ...trackUpdate };
    this.tracks.set(id, updatedTrack);
    return updatedTrack;
  }

  async deleteTrack(id: string): Promise<boolean> {
    return this.tracks.delete(id);
  }

  async searchTracks(query: string): Promise<Track[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.tracks.values()).filter(track =>
      track.title.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      track.album?.toLowerCase().includes(searchTerm) ||
      track.genre?.toLowerCase().includes(searchTerm)
    );
  }

  // Playlists
  async getPlaylist(id: string): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlists.values());
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const id = randomUUID();
    const playlist: Playlist = { ...insertPlaylist, id, createdAt: new Date() };
    this.playlists.set(id, playlist);
    return playlist;
  }

  async updatePlaylist(id: string, playlistUpdate: Partial<InsertPlaylist>): Promise<Playlist | undefined> {
    const existingPlaylist = this.playlists.get(id);
    if (!existingPlaylist) return undefined;
    
    const updatedPlaylist = { ...existingPlaylist, ...playlistUpdate };
    this.playlists.set(id, updatedPlaylist);
    return updatedPlaylist;
  }

  async deletePlaylist(id: string): Promise<boolean> {
    return this.playlists.delete(id);
  }

  // User Preferences
  async getUserPreferences(): Promise<UserPreferences | undefined> {
    if (!this.userPreferences) {
      this.userPreferences = {
        id: randomUUID(),
        volume: 70,
        shuffle: false,
        repeat: false,
        currentTrackId: null,
        currentPosition: 0,
        lastUpdated: new Date(),
      };
    }
    return this.userPreferences;
  }

  async updateUserPreferences(preferences: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences();
    this.userPreferences = { 
      ...current!, 
      ...preferences, 
      lastUpdated: new Date() 
    };
    return this.userPreferences;
  }
}

export const storage = new MemStorage();

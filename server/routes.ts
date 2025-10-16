import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTrackSchema, insertPlaylistSchema, insertUserPreferencesSchema } from "@shared/schema";
import { z } from "zod";

import { asyncHandler } from "./middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Track routes
  app.get("/api/tracks", asyncHandler(async (req, res) => {
    const tracks = await storage.getAllTracks();
    res.json(tracks);
  }));

  app.get("/api/tracks/search", asyncHandler(async (req, res) => {
    const schema = z.object({ q: z.string().min(1, "Search query is required") });
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({ message: "Invalid search query", errors: result.error.errors });
    }

    const tracks = await storage.searchTracks(result.data.q);
    res.json(tracks);
  }));

  app.get("/api/tracks/:id", asyncHandler(async (req, res) => {
    const track = await storage.getTrack(req.params.id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }
    res.json(track);
  }));

  app.post("/api/tracks", asyncHandler(async (req, res) => {
    const validatedTrack = insertTrackSchema.parse(req.body);
    const track = await storage.createTrack(validatedTrack);
    res.status(201).json(track);
  }));

  app.put("/api/tracks/:id", asyncHandler(async (req, res) => {
    const validatedTrack = insertTrackSchema.partial().parse(req.body);
    const track = await storage.updateTrack(req.params.id, validatedTrack);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }
    res.json(track);
  }));

  app.delete("/api/tracks/:id", asyncHandler(async (req, res) => {
    const deleted = await storage.deleteTrack(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Track not found" });
    }
    res.status(204).send();
  }));

  // Playlist routes
  app.get("/api/playlists", asyncHandler(async (req, res) => {
    const playlists = await storage.getAllPlaylists();
    res.json(playlists);
  }));

  app.get("/api/playlists/:id", asyncHandler(async (req, res) => {
    const playlist = await storage.getPlaylist(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    res.json(playlist);
  }));

  app.post("/api/playlists", asyncHandler(async (req, res) => {
    const validatedPlaylist = insertPlaylistSchema.parse(req.body);
    const playlist = await storage.createPlaylist(validatedPlaylist);
    res.status(201).json(playlist);
  }));

  app.put("/api/playlists/:id", asyncHandler(async (req, res) => {
    const validatedPlaylist = insertPlaylistSchema.partial().parse(req.body);
    const playlist = await storage.updatePlaylist(req.params.id, validatedPlaylist);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    res.json(playlist);
  }));

  // User preferences routes
  app.get("/api/preferences", asyncHandler(async (req, res) => {
    const preferences = await storage.getUserPreferences();
    res.json(preferences);
  }));

  app.put("/api/preferences", asyncHandler(async (req, res) => {
    const validatedPreferences = insertUserPreferencesSchema.partial().parse(req.body);
    const preferences = await storage.updateUserPreferences(validatedPreferences);
    res.json(preferences);
  }));

  // Google Drive proxy endpoint
  app.get("/api/drive-proxy/:fileId", (req, res) => {
    try {
      const { fileId } = req.params;
      const apiKey = process.env.VITE_GOOGLE_DRIVE_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ message: "Google Drive API key not configured" });
      }

      const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      
      // Redirect the client to the Google Drive download URL
      res.redirect(302, driveUrl);

    } catch (error) {
      console.error('Google Drive proxy error:', error);
      res.status(500).json({ message: "Failed to proxy Google Drive file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

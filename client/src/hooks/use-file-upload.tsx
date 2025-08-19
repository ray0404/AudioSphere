import { useState, useCallback } from 'react';
import { ID3Parser } from '@/lib/id3-parser';
import { createAudioURL } from '@/lib/audio-utils';
import { Track } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  const { toast } = useToast();

  const uploadFiles = useCallback(async (files: File[]): Promise<Track[]> => {
    setState({ isUploading: true, uploadProgress: 0, error: null });
    
    const supportedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/aac'];
    const validFiles = Array.from(files).filter(file => 
      supportedFormats.some(format => file.type.includes(format.split('/')[1]) || file.name.toLowerCase().includes(format.split('/')[1]))
    );

    if (validFiles.length === 0) {
      setState({ isUploading: false, uploadProgress: 0, error: 'No valid audio files found' });
      toast({
        title: "Invalid Files",
        description: "Please select valid audio files (MP3, WAV, FLAC, M4A, AAC)",
        variant: "destructive",
      });
      return [];
    }

    const uploadedTracks: Track[] = [];
    
    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setState(prev => ({ 
          ...prev, 
          uploadProgress: Math.round((i / validFiles.length) * 100) 
        }));

        try {
          // Parse ID3 tags
          const tags = await ID3Parser.parseFile(file);
          const duration = await ID3Parser.getDuration(file);
          
          // Create audio URL
          const fileUrl = createAudioURL(file);
          
          // Prepare track data
          const trackData = {
            title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: tags.artist || 'Unknown Artist',
            album: tags.album || 'Unknown Album',
            genre: tags.genre || 'Unknown',
            duration: Math.round(duration),
            fileUrl,
            fileSource: 'local' as const,
            albumArt: tags.albumArt || null,
            metadata: {
              originalFileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadDate: new Date().toISOString(),
              ...tags,
            },
          };

          // Save to backend
          const response = await apiRequest('POST', '/api/tracks', trackData);
          const savedTrack = await response.json();
          uploadedTracks.push(savedTrack);

        } catch (fileError) {
          console.error(`Failed to process file ${file.name}:`, fileError);
          toast({
            title: "File Processing Error",
            description: `Failed to process ${file.name}`,
            variant: "destructive",
          });
        }
      }

      setState({ isUploading: false, uploadProgress: 100, error: null });
      
      if (uploadedTracks.length > 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${uploadedTracks.length} track(s)`,
        });
      }

      return uploadedTracks;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({ isUploading: false, uploadProgress: 0, error: errorMessage });
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
    }
  }, [toast]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    return await uploadFiles(files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    const result = await uploadFiles(files);
    // Reset input value to allow selecting the same files again
    event.target.value = '';
    return result;
  }, [uploadFiles]);

  return {
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
    error: state.error,
    uploadFiles,
    handleDrop,
    handleFileSelect,
  };
}

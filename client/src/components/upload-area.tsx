import { useRef } from 'react';
import { Upload, FileAudio, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/use-file-upload';

interface UploadAreaProps {
  onUploadComplete?: () => void;
  className?: string;
}

export function UploadArea({ onUploadComplete, className }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, uploadProgress, handleDrop, handleFileSelect } = useFileUpload();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tracks = await handleDrop(e);
    if (tracks && tracks.length > 0) {
      onUploadComplete?.();
    }
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const tracks = await handleFileSelect(e);
    if (tracks && tracks.length > 0) {
      onUploadComplete?.();
    }
  };

  return (
    <div className={cn("mb-8", className)}>
      <h3 className="text-xl font-bold mb-4 text-white">Add Music</h3>
      
      <div
        className={cn(
          "bg-secondary/40 rounded-lg p-8 border-2 border-dashed transition-all cursor-pointer",
          isUploading 
            ? "border-accent/50 bg-accent/10" 
            : "border-neutral/30 hover:border-accent/50 hover:bg-secondary/60"
        )}
        onDragOver={handleDragOver}
        onDrop={onDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        <div className="text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
              <h4 className="text-lg font-medium mb-2 text-white">Uploading Files...</h4>
              <div className="w-full bg-neutral/30 rounded-full h-2 mb-4">
                <div 
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-neutral">{uploadProgress}% complete</p>
            </>
          ) : (
            <>
              <FileAudio className="w-12 h-12 text-neutral mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2 text-white">Drop your music files here</h4>
              <p className="text-neutral mb-4">Supports MP3, FLAC, WAV, M4A and more</p>
              <button
                className="bg-accent text-black px-6 py-2 rounded-full font-medium hover:bg-accent/90 transition-colors inline-flex items-center space-x-2"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                <span>Choose Files</span>
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.flac,.wav,.m4a,.aac"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeviceScanner } from '@/hooks/use-device-scanner';
import { 
  FolderOpen, 
  HardDrive, 
  Music, 
  Loader2, 
  AlertCircle,
  Smartphone,
  Monitor,
  FolderSearch
} from 'lucide-react';

interface DeviceScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceScannerDialog({ open, onOpenChange }: DeviceScannerDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<'folder' | 'files' | null>(null);
  
  const {
    isScanning,
    scanProgress,
    foundFiles,
    processedFiles,
    error,
    scanDevice,
    quickScan,
    isFileSystemAccessSupported,
  } = useDeviceScanner();

  const handleScanFolder = async () => {
    setSelectedMethod('folder');
    const tracks = await scanDevice('folder');
    if (tracks.length > 0) {
      setTimeout(() => {
        onOpenChange(false);
        setSelectedMethod(null);
      }, 1500);
    }
  };

  const handleScanFiles = () => {
    setSelectedMethod('files');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const tracks = await scanDevice('files', files);
        if (tracks.length > 0) {
          setTimeout(() => {
            onOpenChange(false);
            setSelectedMethod(null);
          }, 1500);
        }
      }
    };
    
    input.click();
  };

  const handleQuickScan = async () => {
    setSelectedMethod('folder');
    const tracks = await quickScan();
    if (tracks.length > 0) {
      setTimeout(() => {
        onOpenChange(false);
        setSelectedMethod(null);
      }, 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Scan Device for Music
          </DialogTitle>
          <DialogDescription>
            Scan your device to find and play audio files directly without uploading them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isScanning && !selectedMethod && (
            <>
              {/* Scan Options */}
              <div className="space-y-3">
                {/* Folder Scan Option */}
                {isFileSystemAccessSupported ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4 px-4"
                    onClick={handleScanFolder}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <FolderOpen className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">Scan Music Folder</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Select a folder to scan all audio files inside it
                        </div>
                      </div>
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Folder scanning is not available in your browser. Use the file selection option below.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Individual Files Option */}
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 px-4"
                  onClick={handleScanFiles}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Music className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">Select Audio Files</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Choose specific audio files from your device
                      </div>
                    </div>
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>

                {/* Quick Scan Option */}
                {isFileSystemAccessSupported && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4 px-4"
                    onClick={handleQuickScan}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <FolderSearch className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">Quick Scan</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Quickly scan common music locations
                        </div>
                      </div>
                    </div>
                  </Button>
                )}
              </div>

              {/* Info Alert */}
              <Alert>
                <Music className="h-4 w-4" />
                <AlertDescription>
                  Your music files stay on your device and are played directly. 
                  No files are uploaded to servers.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Scanning {selectedMethod === 'folder' ? 'folder' : 'files'}...
                  </p>
                  {foundFiles > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Processing {processedFiles} of {foundFiles} audio files
                    </p>
                  )}
                </div>
              </div>
              
              <Progress value={scanProgress} className="h-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Found: {foundFiles} files</span>
                <span>{scanProgress}% complete</span>
              </div>
            </div>
          )}

          {/* Scan Complete */}
          {!isScanning && selectedMethod && scanProgress === 100 && (
            <Alert className="border-green-500/20 bg-green-500/10">
              <Music className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Successfully added {processedFiles} tracks to your library!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cancel Button */}
          {!isScanning && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                setSelectedMethod(null);
              }}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
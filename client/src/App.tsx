import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { Sidebar } from "@/components/sidebar";
import { BottomPlayer } from "@/components/bottom-player";
import { useGoogleDrive } from "@/hooks/use-google-drive";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={() => <div className="p-6 text-white">Search page coming soon...</div>} />
      <Route path="/library" component={() => <div className="p-6 text-white">Library page coming soon...</div>} />
      <Route path="/recent" component={() => <div className="p-6 text-white">Recently played coming soon...</div>} />
      <Route path="/artists" component={() => <div className="p-6 text-white">Artists page coming soon...</div>} />
      <Route path="/albums" component={() => <div className="p-6 text-white">Albums page coming soon...</div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showGoogleDriveDialog, setShowGoogleDriveDialog] = useState(false);
  
  const { 
    isConnected: isGoogleDriveConnected, 
    isLoading: isGoogleDriveLoading,
    files: googleDriveFiles,
    loadGoogleDriveFiles,
    importTracksFromDrive,
    disconnect: disconnectGoogleDrive,
  } = useGoogleDrive();

  const { isUploading } = useFileUpload();

  const handleUploadClick = () => {
    setShowUploadDialog(true);
  };

  const handleGoogleDriveClick = () => {
    setShowGoogleDriveDialog(true);
  };

  const handleConnectGoogleDrive = async () => {
    await loadGoogleDriveFiles();
  };

  const handleImportGoogleDriveFiles = async () => {
    const fileIds = googleDriveFiles.map(file => file.id);
    await importTracksFromDrive(fileIds);
    setShowGoogleDriveDialog(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar 
            onUploadClick={handleUploadClick}
            onGoogleDriveClick={handleGoogleDriveClick}
            isGoogleDriveConnected={isGoogleDriveConnected}
          />
          <main className="flex-1 flex flex-col min-w-0">
            <Router />
          </main>
          <BottomPlayer />
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Music Files</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-neutral mb-4">
                Select or drag and drop your music files here. Supported formats: MP3, FLAC, WAV, M4A, AAC.
              </p>
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.flac,.wav,.m4a,.aac"
                className="w-full p-2 border border-neutral/30 rounded bg-secondary text-white"
                disabled={isUploading}
              />
              {isUploading && (
                <div className="mt-4 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-neutral">Uploading files...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Google Drive Dialog */}
        <Dialog open={showGoogleDriveDialog} onOpenChange={setShowGoogleDriveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Google Drive Integration</DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              {!isGoogleDriveConnected ? (
                <>
                  <p className="text-neutral">
                    Connect to Google Drive to access music files from your shared folder.
                  </p>
                  <Button 
                    onClick={handleConnectGoogleDrive}
                    disabled={isGoogleDriveLoading}
                    className="w-full"
                  >
                    {isGoogleDriveLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect to Google Drive'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-green-400">
                    ✓ Connected to Google Drive ({googleDriveFiles.length} audio files found)
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={handleImportGoogleDriveFiles}
                      disabled={isGoogleDriveLoading || googleDriveFiles.length === 0}
                      className="w-full"
                    >
                      {isGoogleDriveLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import All ${googleDriveFiles.length} Files`
                      )}
                    </Button>
                    <Button 
                      onClick={disconnectGoogleDrive}
                      variant="outline"
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

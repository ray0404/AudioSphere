import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, lazy } from "react";
import * as React from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { Sidebar } from "@/components/sidebar";
import { BottomPlayer } from "@/components/bottom-player";
import { AudioProvider } from "@/contexts/audio-context";
import { useGoogleDrive } from "@/hooks/use-google-drive";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search">
        {() => {
          const SearchPage = lazy(() => import("@/pages/search"));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>}>
              <SearchPage />
            </React.Suspense>
          );
        }}
      </Route>
      <Route path="/library">
        {() => {
          const LibraryPage = lazy(() => import("@/pages/library"));
          return (
            <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>}>
              <LibraryPage />
            </React.Suspense>
          );
        }}
      </Route>
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [folderUrl, setFolderUrl] = useState('');
  
  const isMobile = useIsMobile();
  
  const { 
    isConnected: isGoogleDriveConnected, 
    isLoading: isGoogleDriveLoading,
    files: googleDriveFiles,
    loadGoogleDriveFiles,
    loadGoogleDriveFilesByUrl,
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

  const handleConnectByUrl = async () => {
    if (folderUrl.trim()) {
      await loadGoogleDriveFilesByUrl(folderUrl.trim());
      setFolderUrl('');
    }
  };

  const handleImportGoogleDriveFiles = async () => {
    const fileIds = googleDriveFiles.map(file => file.id);
    await importTracksFromDrive(fileIds);
    setShowGoogleDriveDialog(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AudioProvider>
        <TooltipProvider>
          <div className="flex h-screen bg-background text-foreground overflow-hidden">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar 
              onUploadClick={handleUploadClick}
              onGoogleDriveClick={handleGoogleDriveClick}
              isGoogleDriveConnected={isGoogleDriveConnected}
            />
          )}
          
          {/* Mobile Sidebar Overlay */}
          {isMobile && showMobileSidebar && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <div 
                className="fixed inset-0 bg-black/50" 
                onClick={() => setShowMobileSidebar(false)}
              />
              <div className="fixed left-0 top-0 h-full w-64 z-[60]">
                <Sidebar 
                  onUploadClick={() => {
                    handleUploadClick();
                    setShowMobileSidebar(false);
                  }}
                  onGoogleDriveClick={() => {
                    handleGoogleDriveClick();
                    setShowMobileSidebar(false);
                  }}
                  isGoogleDriveConnected={isGoogleDriveConnected}
                />
              </div>
            </div>
          )}
          
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile Header */}
            {isMobile && (
              <div className="bg-secondary border-b border-neutral/20 p-4 flex items-center justify-between lg:hidden">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="text-white hover:text-accent transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                  <h1 className="text-lg font-bold text-white">SoundWave</h1>
                </div>
                <div className="w-6" /> {/* Spacer for centering */}
              </div>
            )}
            <div className="flex-1 overflow-y-auto pb-32 scrollable-content">
              <Router />
            </div>
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
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Share a Google Drive folder link:
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="https://drive.google.com/drive/folders/..."
                          value={folderUrl}
                          onChange={(e) => setFolderUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleConnectByUrl}
                          disabled={isGoogleDriveLoading || !folderUrl.trim()}
                          size="sm"
                        >
                          {isGoogleDriveLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-neutral mt-1">
                        Make sure the folder is shared publicly or with "Anyone with the link can view"
                      </p>
                    </div>
                    
                    <div className="text-center text-neutral text-sm">or</div>
                    
                    <Button 
                      onClick={handleConnectGoogleDrive}
                      disabled={isGoogleDriveLoading}
                      className="w-full"
                      variant="outline"
                    >
                      {isGoogleDriveLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Use API Key (Advanced)'
                      )}
                    </Button>
                  </div>
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
      </AudioProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIOS, isInStandaloneMode, install, getIOSInstallInstructions } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt after user has been on site for 30 seconds
    const timer = setTimeout(() => {
      if (!dismissed && !isInstalled && !isInStandaloneMode) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [dismissed, isInstalled, isInStandaloneMode]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isInStandaloneMode || !showPrompt) {
    return null;
  }

  // iOS-specific instructions
  if (isIOS) {
    const instructions = getIOSInstallInstructions();
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <Card className="bg-background/95 backdrop-blur border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {instructions.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Install for offline listening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To install on iOS:
            </p>
            <ol className="text-sm space-y-1 ml-4">
              {instructions.steps.map((step, index) => (
                <li key={index} className="list-decimal">
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard install prompt for other browsers
  if (canInstall) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <Card className="bg-background/95 backdrop-blur border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Install SoundWave
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Listen to your music offline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Install SoundWave for a better experience:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li className="list-disc">Works offline</li>
              <li className="list-disc">Faster loading</li>
              <li className="list-disc">Full-screen mode</li>
              <li className="list-disc">Home screen icon</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleInstall}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Install Now
              </Button>
              <Button 
                onClick={handleDismiss}
                variant="outline"
                className="flex-1"
              >
                Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
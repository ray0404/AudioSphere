import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Search, 
  Library, 
  Clock, 
  Mic, 
  Disc, 
  Upload, 
  Wifi, 
  Music 
} from 'lucide-react';
import { SiGoogledrive } from 'react-icons/si';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onUploadClick: () => void;
  onGoogleDriveClick: () => void;
  isGoogleDriveConnected: boolean;
}

export function Sidebar({ onUploadClick, onGoogleDriveClick, isGoogleDriveConnected }: SidebarProps) {
  const [location] = useLocation();

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/library', label: 'Your Library', icon: Library },
  ];

  const libraryItems = [
    { href: '/recent', label: 'Recently Played', icon: Clock },
    { href: '/artists', label: 'Artists', icon: Mic },
    { href: '/albums', label: 'Albums', icon: Disc },
  ];

  return (
    <div className="w-64 bg-black flex flex-col border-r border-neutral/20 h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-neutral/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">SoundWave</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2 mb-6">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer",
                    isActive 
                      ? "bg-secondary text-white" 
                      : "text-neutral hover:text-white hover:bg-neutral/20"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Library Sections */}
        <div className="space-y-2 mb-6">
          <h3 className="text-neutral text-sm font-semibold uppercase tracking-wider px-3 mb-3">
            Library
          </h3>
          {libraryItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer",
                    isActive 
                      ? "bg-secondary text-white" 
                      : "text-neutral hover:text-white hover:bg-neutral/20"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* File Sources */}
        <div className="space-y-2">
          <h3 className="text-neutral text-sm font-semibold uppercase tracking-wider px-3 mb-3">
            Sources
          </h3>
          
          {/* Online Status */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-600/20 border border-green-600/30">
            <Wifi className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Online</span>
          </div>
          
          {/* Upload Local Files */}
          <button
            onClick={onUploadClick}
            className="w-full flex items-center space-x-3 p-3 rounded-lg text-neutral hover:text-white hover:bg-neutral/20 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Local Files</span>
          </button>
          
          {/* Google Drive */}
          <button
            onClick={onGoogleDriveClick}
            className={cn(
              "w-full flex items-center space-x-3 p-3 rounded-lg transition-colors",
              isGoogleDriveConnected
                ? "bg-blue-600/20 border border-blue-600/30 text-blue-400"
                : "text-neutral hover:text-white hover:bg-neutral/20"
            )}
          >
            <SiGoogledrive className="w-5 h-5" />
            <span>
              {isGoogleDriveConnected ? 'Google Drive Connected' : 'Connect Google Drive'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[300]">
      <InlineAlert variant="warning">
        <div className="flex items-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>You are offline. Some features may be unavailable.</span>
        </div>
      </InlineAlert>
    </div>
  );
}
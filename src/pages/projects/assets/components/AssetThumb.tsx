import { useState } from 'react';
import { Image, Film, FileText, File } from 'lucide-react';
import type { AssetRecord } from '@/pages/projects/sandbox/sandboxAssets';

interface AssetThumbProps {
  asset: AssetRecord;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

export function AssetThumb({ asset, className = '', objectFit = 'cover' }: AssetThumbProps) {
  const [failed, setFailed] = useState(false);
  const isImage = asset.type === 'image' || asset.type === 'svg';
  const showImage = isImage && asset.url && !failed;

  if (showImage) {
    return (
      <img
        src={asset.url}
        alt={asset.altText || asset.name}
        onError={() => setFailed(true)}
        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
        loading="lazy"
      />
    );
  }

  const Icon =
    asset.type === 'video' ? Film : asset.type === 'document' ? FileText : File;

  return (
    <div className={`flex items-center justify-center bg-forge-bg ${className}`}>
      <Icon className="h-6 w-6 text-forge-text-muted" />
    </div>
  );
}
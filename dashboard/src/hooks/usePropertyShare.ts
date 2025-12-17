import { useState, useCallback, RefObject } from 'react';
import html2canvas from 'html2canvas';
import { Property, Listing, RentalListing } from '@/types/property';

interface UsePropertyShareReturn {
  shareProperty: () => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function usePropertyShare(
  snapshotRef: RefObject<HTMLDivElement | null>,
  data: Property | Listing | RentalListing | null,
  type: 'sold' | 'forSale' | 'rental'
): UsePropertyShareReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareProperty = useCallback(async () => {
    if (!snapshotRef.current || !data) {
      setError('No property data available');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate the image from the DOM element using html2canvas
      // html2canvas handles CORS better than html-to-image
      // Override device pixel ratio to ensure consistent 1080x1080 output
      const rawCanvas = await html2canvas(snapshotRef.current, {
        scale: 1080 / snapshotRef.current.offsetWidth, // Calculate scale to get exactly 1080px width
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });

      // Always resize to exactly 1080x1080 to ensure consistent output
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the captured canvas scaled to exactly 1080x1080
        ctx.drawImage(rawCanvas, 0, 0, 1080, 1080);
      }

      // Convert canvas to blob using JPEG format for smaller file size
      // JPEG at 0.92 quality balances quality and file size (typically 150-300KB)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`Generated image: ${(blob.size / 1024).toFixed(0)}KB (${canvas.width}x${canvas.height}px)`);
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/jpeg', 0.92);
      });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename from address
      const addressSlug = data.address
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50); // Limit length
      
      link.download = `property-${addressSlug}.jpg`;
      link.href = url;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsGenerating(false);
    } catch (err) {
      console.error('Error generating property snapshot:', err);
      setError('Failed to generate snapshot. Please try again.');
      setIsGenerating(false);
    }
  }, [snapshotRef, data]);

  return {
    shareProperty,
    isGenerating,
    error,
  };
}


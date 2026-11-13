'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/lib/analytics';

/** Counts a paid report once, when its page first opens after payment. */
export default function TrackPurchase({ id, value, label }: { id: string; value: number; label: string }) {
  useEffect(() => {
    trackPurchase({ id, value, label });
  }, [id, value, label]);
  return null;
}

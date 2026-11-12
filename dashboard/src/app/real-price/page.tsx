/**
 * Real Price Check
 *
 * Server component: loads the list of areas and data freshness, then hands off
 * to the interactive client component.
 */

import { Metadata } from 'next';
import { BACKTEST } from '@/lib/real-price/backtest';
import { getSalesStore } from '@/lib/real-price/store';
import RealPriceClient from './RealPriceClient';

export const metadata: Metadata = {
  title: 'What Will It Really Sell For? Dublin Asking Price Checker | Irish Property Data',
  description:
    'Enter the asking price of any Dublin home and see what similar homes actually sold for, how far over asking you may need to bid, and what your budget can realistically chase.',
  keywords: [
    'how much over asking Dublin',
    'Dublin house bidding',
    'asking price vs sold price Dublin',
    'how much to bid on a house Ireland',
    'Dublin sold prices',
  ],
  openGraph: {
    title: 'What will it really sell for? Dublin asking price checker',
    description:
      'Asking prices in Dublin are a starting point. See what similar homes actually sold for and how far over asking you may need to bid.',
    type: 'website',
  },
};

export default function RealPricePage() {
  const store = getSalesStore();
  return (
    <RealPriceClient
      areas={store.areas}
      dataTo={new Date(store.asOf).toISOString().slice(0, 10)}
      salesCount={store.sales.length}
      backtest={BACKTEST}
    />
  );
}

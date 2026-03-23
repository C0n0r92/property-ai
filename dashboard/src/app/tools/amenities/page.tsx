import { Metadata } from 'next';
import AmenitiesToolClient from './AmenitiesToolClient';

export const metadata: Metadata = {
  title: 'Walkability & Amenities Analysis | Dublin Location Score | Irish Property Data',
  description: 'Check walkability scores and nearby amenities for any Dublin address. Transport links, schools, shops, healthcare, parks - everything you need to evaluate a location. Free tool.',
  keywords: [
    'walkability score Dublin',
    'Dublin amenities check',
    'location analysis Dublin',
    'Dublin transport access',
    'schools near address Dublin',
    'Dublin location rating',
    'walkability checker Ireland',
  ],
  openGraph: {
    title: 'Walkability & Amenities Analysis | Dublin Location Score',
    description: 'Check walkability scores and nearby amenities for any Dublin address. Transport, schools, shops, healthcare analysis.',
    type: 'website',
    url: 'https://irishpropertydata.com/tools/amenities',
  },
  twitter: {
    card: 'summary',
    title: 'Walkability & Amenities Analysis | Irish Property Data',
    description: 'Check walkability and nearby amenities for any Dublin address.',
  },
  alternates: {
    canonical: '/tools/amenities',
  },
};

export default function AmenitiesToolPage() {
  return <AmenitiesToolClient />;
}

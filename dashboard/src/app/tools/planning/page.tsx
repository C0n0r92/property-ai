import { Metadata } from 'next';
import PlanningToolClient from './PlanningToolClient';

export const metadata: Metadata = {
  title: 'Planning Permission Analysis Tool | Check Dublin Development Activity | Irish Property Data',
  description: 'Analyze planning permissions near any Dublin address. View approval rates, development timelines, and understand how planning activity affects property values. Free tool.',
  keywords: [
    'planning permission Dublin',
    'Dublin planning applications',
    'planning permission search Ireland',
    'development activity Dublin',
    'planning permission checker',
    'Dublin building permissions',
    'property planning history',
  ],
  openGraph: {
    title: 'Planning Permission Analysis Tool | Dublin Development Activity',
    description: 'Analyze planning permissions and development activity near any Dublin address. Free tool with approval rates and timelines.',
    type: 'website',
    url: 'https://irishpropertydata.com/tools/planning',
  },
  twitter: {
    card: 'summary',
    title: 'Planning Permission Analysis | Irish Property Data',
    description: 'Check planning permissions and development activity for any Dublin address.',
  },
  alternates: {
    canonical: '/tools/planning',
  },
};

export default function PlanningToolPage() {
  return <PlanningToolClient />;
}

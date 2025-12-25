/**
 * Mortgage Calculator Page
 *
 * Server component that exports metadata and renders the client calculator component.
 */

import { Metadata } from 'next';
import MortgageCalculatorClient from './MortgageCalculatorClient';

export const metadata: Metadata = {
  title: 'Mortgage Calculator Ireland | Calculate Payments, Compare Scenarios | Irish Property Data',
  description: 'Free mortgage calculator for Ireland. Calculate exact monthly payments, compare loan scenarios, explore rates & terms. See amortization schedules and payoff timelines. EUR currency support.',
  keywords: ['mortgage calculator Ireland', 'Irish mortgage calculator', 'home loan calculator', 'mortgage payment calculator', 'amortization schedule Ireland', 'compare mortgage rates', 'loan payoff calculator'],
  openGraph: {
    title: 'Mortgage Calculator Ireland | Calculate Payments & Compare Scenarios',
    description: 'Free mortgage calculator for Ireland. Calculate exact monthly payments, compare loan scenarios, explore rates & terms. See amortization schedules and payoff timelines.',
    type: 'website',
  },
};

export default function MortgageCalculatorPage() {
  return <MortgageCalculatorClient />;
}

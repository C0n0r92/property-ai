import React from 'react';
import { renderToString } from 'react-dom/server';
import { AlertNotification } from '@/emails/alert-notification';
import { AlertConfirmation } from '@/emails/alert-confirmation';

interface Property {
  id: string;
  address: string;
  asking_price?: number;
  sold_price?: number;
  monthly_rent?: number;
  beds?: number;
  baths?: number;
  area_sqm?: number;
  is_listing?: boolean;
  is_rental?: boolean;
  sold_date?: string;
  price_history?: Array<{ date: string; price: number }>;
}

export function renderAlertNotificationEmail(data: {
  locationName: string;
  radius: number;
  newListings: Property[];
  newRentals: Property[];
  newSales: Property[];
  priceDrops: Property[];
  manageLink: string;
  unsubscribeLink: string;
}): string {
  return renderToString(
    React.createElement(AlertNotification, data)
  );
}

export function renderAlertConfirmationEmail(data: {
  locationName: string;
  radius: number;
  propertyType: string;
  alertPreferences: {
    newListings: boolean;
    priceDrops: boolean;
    newSales: boolean;
  };
  expiresAt: string;
  manageLink: string;
}): string {
  return renderToString(
    React.createElement(AlertConfirmation, data)
  );
}

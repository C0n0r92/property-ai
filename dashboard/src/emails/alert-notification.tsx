import React from 'react';

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

interface AlertNotificationProps {
  locationName: string;
  radius: number;
  newListings: Property[];
  newRentals: Property[];
  newSales: Property[];
  priceDrops: Property[];
  manageLink: string;
  unsubscribeLink: string;
}

export function AlertNotification({
  locationName,
  radius,
  newListings,
  newRentals,
  newSales,
  priceDrops,
  manageLink,
  unsubscribeLink,
}: AlertNotificationProps) {
  const totalProperties = newListings.length + newRentals.length + newSales.length + priceDrops.length;

  const formatPrice = (price: number) => `€${price.toLocaleString()}`;

  const PropertyCard = ({ property, type }: { property: Property; type: string }) => {
    const price = property.asking_price ? formatPrice(property.asking_price) :
                 property.sold_price ? formatPrice(property.sold_price) :
                 property.monthly_rent ? `${formatPrice(property.monthly_rent)}/month` :
                 'Price TBA';

    const details = [
      property.beds ? `${property.beds} bed` : '',
      property.baths ? `${property.baths} bath` : '',
      property.area_sqm ? `${property.area_sqm}m²` : '',
    ].filter(Boolean).join(', ');

    return (
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        margin: '10px 0',
        padding: '15px',
        backgroundColor: '#ffffff',
      }}>
        <div style={{
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '5px',
          fontSize: '16px',
        }}>
          {property.address}
        </div>
        <div style={{
          color: '#059669',
          fontWeight: '600',
          fontSize: '18px',
          marginBottom: '5px',
        }}>
          {price}
        </div>
        {details && (
          <div style={{
            color: '#64748b',
            fontSize: '14px',
          }}>
            {details}
          </div>
        )}
      </div>
    );
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Property Alert - {locationName}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 5px;
          }
          .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .section-title {
            color: #1e293b;
            font-size: 18px;
            font-weight: 600;
            margin: 25px 0 15px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>🏠 Property Alert</h1>
            <p style={{ margin: '0', fontSize: '16px', opacity: '0.9' }}>
              {totalProperties} new propert{totalProperties === 1 ? 'y' : 'ies'} in {locationName}
            </p>
          </div>

          {/* Content */}
          <div className="content">
            <p>Hello,</p>
            <p>
              We found <strong>{totalProperties}</strong> new propert{totalProperties === 1 ? 'y' : 'ies'}
              matching your alert criteria within {radius}km of {locationName}:
            </p>

            {/* New Listings */}
            {newListings.length > 0 && (
              <div>
                <div className="section-title">🏡 New Listings ({newListings.length})</div>
                {newListings.map((property, index) => (
                  <PropertyCard key={index} property={property} type="listing" />
                ))}
              </div>
            )}

            {/* New Rentals */}
            {newRentals.length > 0 && (
              <div>
                <div className="section-title">🏠 New Rentals ({newRentals.length})</div>
                {newRentals.map((property, index) => (
                  <PropertyCard key={index} property={property} type="rental" />
                ))}
              </div>
            )}

            {/* New Sales */}
            {newSales.length > 0 && (
              <div>
                <div className="section-title">💰 Recent Sales ({newSales.length})</div>
                {newSales.map((property, index) => (
                  <PropertyCard key={index} property={property} type="sale" />
                ))}
              </div>
            )}

            {/* Price Drops */}
            {priceDrops.length > 0 && (
              <div>
                <div className="section-title">📉 Price Changes ({priceDrops.length})</div>
                {priceDrops.map((property, index) => (
                  <PropertyCard key={index} property={property} type="price_drop" />
                ))}
              </div>
            )}

            {/* CTA */}
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href="https://irishpropertydata.com/alerts" className="button">
                View Saved Properties
              </a>
              <div style={{ margin: '15px 0', fontSize: '14px', color: '#64748b' }}>
                💾 All properties from this alert have been automatically saved to your account
              </div>
            </div>

            {/* Links */}
            <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '14px' }}>
              <a href={manageLink} style={{ color: '#3b82f6', textDecoration: 'none', margin: '0 10px' }}>
                Manage Your Alerts
              </a>
              {' | '}
              <a href={unsubscribeLink} style={{ color: '#64748b', textDecoration: 'none', margin: '0 10px' }}>
                Unsubscribe
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p style={{ margin: '0 0 10px 0' }}>
              You're receiving this because you have an alert set up for {locationName}.<br />
              This alert is valid until your subscription expires.
            </p>
            <p style={{ margin: '0' }}>
              <a href="https://irishpropertydata.com" style={{ color: '#64748b' }}>
                Irish Property Data
              </a>
              {' • '}
              <a href="https://irishpropertydata.com" style={{ color: '#64748b' }}>
                irishpropertydata.com
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

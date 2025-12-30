import React from 'react';

interface AlertConfirmationProps {
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
}

export function AlertConfirmation({
  locationName,
  radius,
  propertyType,
  alertPreferences,
  expiresAt,
  manageLink,
}: AlertConfirmationProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const alertTypes = [];
  if (alertPreferences.newListings) alertTypes.push('new listings');
  if (alertPreferences.priceDrops) alertTypes.push('price changes');
  if (alertPreferences.newSales) alertTypes.push('new sales');

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Alert Confirmed - {locationName}</title>
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
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .success-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
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
        `}</style>
      </head>
      <body>
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>✅ Alert Confirmed!</h1>
            <p style={{ margin: '0', fontSize: '16px', opacity: '0.9' }}>
              You're now tracking properties in {locationName}
            </p>
          </div>

          {/* Content */}
          <div className="content">
            <div className="success-card">
              <h2 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '20px' }}>
                🎉 Your property alert is active!
              </h2>
              <p style={{ margin: '0', color: '#166534' }}>
                We'll notify you when new properties match your criteria.
              </p>
            </div>

            <h3 style={{ color: '#1e293b', marginBottom: '15px' }}>Alert Details:</h3>

            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Location:</span>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>{locationName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Search Radius:</span>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>{radius}km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Property Type:</span>
                  <span style={{ color: '#1e293b', fontWeight: '500', textTransform: 'capitalize' }}>
                    {propertyType}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Notifications:</span>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>
                    {alertTypes.join(', ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Expires:</span>
                  <span style={{ color: '#1e293b', fontWeight: '500' }}>
                    {formatDate(expiresAt)}
                  </span>
                </div>
              </div>
            </div>

            <h3 style={{ color: '#1e293b', marginBottom: '15px' }}>What happens next?</h3>

            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ color: '#3b82f6', fontSize: '18px', marginTop: '-2px' }}>📧</div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                    Receive Email Alerts
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    We'll send you emails when new properties match your criteria
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ color: '#3b82f6', fontSize: '18px', marginTop: '-2px' }}>⚙️</div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                    Manage Your Alerts
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    Update preferences, pause, or add new locations anytime
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ color: '#3b82f6', fontSize: '18px', marginTop: '-2px' }}>🔄</div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                    Auto-Renewal
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    We'll remind you before your alert expires so you can renew
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <a href={manageLink} className="button">
                Manage Your Alerts
              </a>
            </div>

            {/* Help */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '20px'
            }}>
              <div style={{ fontWeight: '500', color: '#92400e', marginBottom: '8px' }}>
                💡 Pro Tip
              </div>
              <div style={{ color: '#92400e', fontSize: '14px' }}>
                You can set up multiple alerts for different areas. Each alert costs €4 for 12 months.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p style={{ margin: '0' }}>
              Questions? Contact us at{' '}
              <a href="mailto:hello@irishpropertydata.com" style={{ color: '#3b82f6' }}>
                hello@irishpropertydata.com
              </a>
            </p>
            <p style={{ margin: '5px 0 0 0' }}>
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

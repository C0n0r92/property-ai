import { Property, Listing, RentalListing } from '@/types/property';
import { formatFullPrice } from '@/lib/format';

interface PropertySnapshotProps {
  property?: Property;
  listing?: Listing;
  rental?: RentalListing;
  snapshotRef?: React.RefObject<HTMLDivElement | null>;
}

export function PropertySnapshot({ property, listing, rental, snapshotRef }: PropertySnapshotProps) {
  // Determine which type of property we're dealing with
  const isSold = !!property;
  const isForSale = !!listing;
  const isRental = !!rental;
  
  // Get the relevant data
  const data = property || listing || rental;
  if (!data) return null;
  
  // Extract common fields
  const address = data.address;
  const beds = data.beds;
  const baths = data.baths;
  const areaSqm = data.areaSqm;
  const propertyType = data.propertyType;
  
  // Extract price/rent
  const price = isSold 
    ? property.soldPrice 
    : isForSale 
      ? listing.askingPrice 
      : rental?.monthlyRent ?? 0;
  
  // Format date for sold properties
  const soldDate = isSold && property?.soldDate 
    ? new Date(property.soldDate).toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
    : null;
  
  // Determine gradient colors based on type
  const gradientFrom = isSold ? '#1e3a8a' : isForSale ? '#be123c' : '#6b21a8';
  const gradientTo = isSold ? '#0ea5e9' : isForSale ? '#f43f5e' : '#a855f7';
  const statusBgColor = isSold ? '#2563eb' : isForSale ? '#e11d48' : '#9333ea';
  
  // Status badge
  const statusBadge = isSold ? '🏠 Sold' : isForSale ? '🏷️ For Sale' : '🏘️ Rental';
  
  // Format price display
  const priceDisplay = isRental 
    ? `€${price.toLocaleString()}/mo` 
    : formatFullPrice(price);
  
  return (
    <div 
      ref={snapshotRef}
      style={{ 
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: '1080px', 
        height: '1080px' 
      }}
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Decorative background pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
          <div style={{ position: 'absolute', top: '80px', right: '80px', width: '384px', height: '384px', borderRadius: '50%', border: '8px solid white' }}></div>
          <div style={{ position: 'absolute', bottom: '80px', left: '80px', width: '288px', height: '288px', borderRadius: '50%', border: '8px solid white' }}></div>
        </div>
        
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          {/* Header with status badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ padding: '16px 32px', borderRadius: '9999px', backgroundColor: statusBgColor, color: 'white', fontSize: '32px', fontWeight: 'bold', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' }}>
              {statusBadge}
            </div>
            {soldDate && (
              <div style={{ padding: '16px 32px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', fontSize: '24px', fontWeight: 600 }}>
                {soldDate}
              </div>
            )}
          </div>
          
          {/* Main content - centered */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
            {/* Address */}
            <h1 style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: '1.2', color: 'white', textShadow: '0 4px 6px rgba(0,0,0,0.3)', margin: 0 }}>
              {address}
            </h1>
            
            {/* Price - large and prominent */}
            <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', textShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
              {priceDisplay}
            </div>
            
            {/* Property details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              {beds && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '6px' }}>Bedrooms</div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '32px' }}>{beds}</div>
                </div>
              )}
              {baths && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '6px' }}>Bathrooms</div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '32px' }}>{baths}</div>
                </div>
              )}
              {propertyType && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '6px' }}>Type</div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '28px' }}>{propertyType}</div>
                </div>
              )}
              {areaSqm && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '6px' }}>Floor Area</div>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '32px' }}>{areaSqm} m²</div>
                </div>
              )}
            </div>
            
            {/* Additional info for sold properties */}
            {isSold && property && (
              <>
                {property.pricePerSqm && property.pricePerSqm > 0 && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '22px' }}>Price per m²</span>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '32px', fontFamily: 'monospace' }}>
                        €{property.pricePerSqm.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                
                {property.askingPrice && property.askingPrice > 0 && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Asking Price</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '22px', fontFamily: 'monospace' }}>
                        {formatFullPrice(property.askingPrice)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Difference</span>
                      <span style={{ 
                        color: property.soldPrice > property.askingPrice ? '#fca5a5' : property.soldPrice < property.askingPrice ? '#86efac' : '#fde047',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        {property.soldPrice > property.askingPrice ? '+' : ''}
                        €{Math.abs(property.soldPrice - property.askingPrice).toLocaleString()}
                        {' '}
                        ({property.soldPrice > property.askingPrice ? '+' : ''}
                        {Math.round((property.soldPrice - property.askingPrice) / property.askingPrice * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
                
                {property.soldDate && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Sold Date</span>
                      <span style={{ color: 'white', fontSize: '22px' }}>
                        {new Date(property.soldDate).toLocaleDateString('en-IE', { 
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Price per sqm for listings */}
            {isForSale && listing && listing.pricePerSqm && listing.pricePerSqm > 0 && (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Price per m²</span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '26px', fontFamily: 'monospace' }}>
                    €{listing.pricePerSqm.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            
            {/* BER Rating for listings and rentals */}
            {(isForSale || isRental) && (listing || rental) && (listing || rental)?.berRating && (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>BER Rating</span>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: '26px' }}>
                    {(isForSale ? listing : rental)!.berRating}
                  </span>
                </div>
              </div>
            )}
            
            {/* Yield info if available */}
            {(isSold || isForSale) && (property || listing)?.yieldEstimate && (
              <div style={{ backgroundColor: 'rgba(5, 150, 105, 0.3)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '18px', border: '2px solid #34d399', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'white', fontSize: '20px' }}>Est. Gross Yield</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                      {(isSold ? property : listing)!.yieldEstimate!.confidence} confidence
                    </span>
                  </div>
                  <span style={{ color: '#a7f3d0', fontWeight: 900, fontSize: '38px', fontFamily: 'monospace' }}>
                    {(isSold ? property : listing)!.yieldEstimate!.grossYield.toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>Est. Monthly Rent</span>
                  <span style={{ color: 'white', fontSize: '18px', fontFamily: 'monospace' }}>
                    €{(isSold ? property : listing)!.yieldEstimate!.monthlyRent.toLocaleString()}/mo
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>Est. Annual Return</span>
                  <span style={{ color: 'white', fontSize: '18px', fontFamily: 'monospace' }}>
                    €{((isSold ? property : listing)!.yieldEstimate!.monthlyRent * 12).toLocaleString()}/yr
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.4', marginTop: '8px' }}>
                  {(isSold ? property : listing)!.yieldEstimate!.note}
                </div>
              </div>
            )}
            
            {/* Rental-specific info */}
            {isRental && rental && (
              <>
                {rental.rentPerSqm && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Rent per m²</span>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '24px', fontFamily: 'monospace' }}>
                        €{rental.rentPerSqm.toFixed(2)}/mo
                      </span>
                    </div>
                  </div>
                )}
                {rental.rentPerBed && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Rent per Bedroom</span>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '24px', fontFamily: 'monospace' }}>
                        €{rental.rentPerBed.toLocaleString()}/mo
                      </span>
                    </div>
                  </div>
                )}
                {rental.furnishing && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '20px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>Furnishing</span>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '24px' }}>
                        {rental.furnishing}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer - branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '32px', fontWeight: 600 }}>
              property-ml.com
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '24px' }}>
              Dublin Property Data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


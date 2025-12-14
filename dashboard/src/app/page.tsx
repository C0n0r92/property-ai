import { loadProperties, getMarketStats, getAreaStats } from '@/lib/data';
import { formatPrice, formatFullPrice } from '@/lib/format';
import Link from 'next/link';

export default function Home() {
  const properties = loadProperties();
  const stats = getMarketStats(properties);
  const areaStats = getAreaStats(properties);
  
  // Calculate real insights
  const avgOverAsking = properties.filter(p => p.overUnderPercent > 0)
    .reduce((sum, p) => sum + p.overUnderPercent, 0) / properties.filter(p => p.overUnderPercent > 0).length;
  
  // Budget brackets
  const under400k = properties.filter(p => p.soldPrice < 400000);
  const under600k = properties.filter(p => p.soldPrice >= 400000 && p.soldPrice < 600000);
  const over1m = properties.filter(p => p.soldPrice >= 1000000);
  
  // Best value areas (lowest price per sqm with good volume)
  const valueAreas = areaStats
    .filter(a => a.avgPricePerSqm > 0 && a.count >= 30)
    .sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm)
    .slice(0, 5);
  
  // Hot areas (highest growth)
  const hotAreas = areaStats
    .filter(a => a.change6m > 0 && a.count >= 20)
    .sort((a, b) => b.change6m - a.change6m)
    .slice(0, 5);
  
  // Recent sales (for social proof)
  const recentCount = properties.filter(p => {
    const d = new Date(p.soldDate);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;
  
  // Properties sold under market value
  const deals = properties.filter(p => {
    const area = areaStats.find(a => p.address.includes(a.name));
    if (!area || !p.pricePerSqm || !area.avgPricePerSqm) return false;
    return p.pricePerSqm < area.avgPricePerSqm * 0.85; // 15% below avg
  }).slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-glow)] via-transparent to-transparent opacity-50" />
        
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-secondary)]">
              📊 {recentCount.toLocaleString()} properties sold in the last 30 days
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Know What Dublin
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent">
                Properties Are Really Worth
              </span>
            </h1>
            
            <p className="text-xl text-[var(--foreground-secondary)] mb-10 max-w-2xl mx-auto">
              Stop guessing. See actual sold prices, discover undervalued properties, 
              and understand where your money goes furthest.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/map" className="btn-primary">
                Explore the Map →
              </Link>
              <Link href="/insights" className="btn-secondary">
                View Market Insights
              </Link>
            </div>
          </div>
          
          {/* Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card animate-in">
              <div className="stat-label">Properties Analyzed</div>
              <div className="stat-value text-[var(--accent)]">
                {stats.totalProperties.toLocaleString()}
              </div>
            </div>
            <div className="stat-card animate-in animate-delay-1">
              <div className="stat-label">Median Sold Price</div>
              <div className="stat-value">{formatFullPrice(stats.medianPrice)}</div>
            </div>
            <div className="stat-card animate-in animate-delay-2">
              <div className="stat-label">Sell Over Asking</div>
              <div className="stat-value positive">{stats.pctOverAsking}%</div>
              <div className="text-sm text-[var(--foreground-muted)] mt-2">
                Avg +{avgOverAsking.toFixed(1)}% premium
              </div>
            </div>
            <div className="stat-card animate-in animate-delay-3">
              <div className="stat-label">Price Growth (YoY)</div>
              <div className={`stat-value ${stats.priceChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange}%
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Key Insight Banner */}
      <section className="py-8 px-4 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <div>
              <span className="text-3xl font-bold">{under400k.length.toLocaleString()}</span>
              <span className="text-[var(--foreground-secondary)] ml-2">properties under €400k</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-[var(--border)]" />
            <div>
              <span className="text-3xl font-bold">€{stats.avgPricePerSqm.toLocaleString()}</span>
              <span className="text-[var(--foreground-secondary)] ml-2">average per sqm</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-[var(--border)]" />
            <div>
              <span className="text-3xl font-bold">{over1m.length.toLocaleString()}</span>
              <span className="text-[var(--foreground-secondary)] ml-2">sold over €1M</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Actionable Insights */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">What You Need to Know</h2>
          <p className="text-[var(--foreground-secondary)] mb-8">Real insights to help you make better decisions</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="insight-card accent">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Expect to Pay Over Asking</h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                {stats.pctOverAsking}% of properties sell above asking price. 
                Budget an extra <span className="text-[var(--accent)] font-semibold">
                €{Math.round(stats.medianPrice * avgOverAsking / 100 / 1000) * 1000}
                </span> on average.
              </p>
              <Link href="/insights" className="text-[var(--accent)] text-sm font-medium hover:underline">
                See trends by area →
              </Link>
            </div>
            
            <div className="insight-card positive">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-lg mb-2">Best Value Right Now</h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                <span className="text-[var(--positive)] font-semibold">{valueAreas[0]?.name}</span> offers 
                the best value at €{valueAreas[0]?.avgPricePerSqm.toLocaleString()}/sqm — 
                {Math.round((1 - valueAreas[0]?.avgPricePerSqm / stats.avgPricePerSqm) * 100)}% below average.
              </p>
              <Link href="/map" className="text-[var(--accent)] text-sm font-medium hover:underline">
                Explore on map →
              </Link>
            </div>
            
            <div className="insight-card negative">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-semibold text-lg mb-2">Fastest Rising Area</h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                <span className="text-[var(--warning)] font-semibold">{hotAreas[0]?.name}</span> is up 
                <span className="text-[var(--warning)]"> +{hotAreas[0]?.change6m}%</span> in 6 months. 
                Prices are moving fast here.
              </p>
              <Link href="/insights" className="text-[var(--accent)] text-sm font-medium hover:underline">
                See all trends →
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Budget Guide */}
      <section className="py-16 px-4 bg-[var(--background-secondary)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">What Can You Afford?</h2>
          <p className="text-[var(--foreground-secondary)] mb-8">Quick guide based on real sold prices</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-static">
              <div className="text-sm font-medium text-[var(--foreground-muted)] mb-2">BUDGET</div>
              <div className="text-3xl font-bold mb-4">Under €400k</div>
              <div className="space-y-3 text-[var(--foreground-secondary)]">
                <p>✓ {under400k.filter(p => p.propertyType?.includes('Apartment')).length.toLocaleString()} apartments available</p>
                <p>✓ Best areas: {valueAreas.slice(0, 2).map(a => a.name).join(', ')}</p>
                <p>✓ Avg size: {Math.round(under400k.filter(p => p.areaSqm).reduce((s, p) => s + (p.areaSqm || 0), 0) / under400k.filter(p => p.areaSqm).length)}m²</p>
              </div>
              <Link href="/map" className="btn-secondary mt-6 w-full text-center block">
                View on Map
              </Link>
            </div>
            
            <div className="card-static border-[var(--accent)]">
              <div className="text-sm font-medium text-[var(--accent)] mb-2">MOST COMMON</div>
              <div className="text-3xl font-bold mb-4">€400k - €600k</div>
              <div className="space-y-3 text-[var(--foreground-secondary)]">
                <p>✓ {under600k.length.toLocaleString()} properties in this range</p>
                <p>✓ Mix of houses and apartments</p>
                <p>✓ Most 3-bed options here</p>
              </div>
              <Link href="/map" className="btn-primary mt-6 w-full text-center block">
                View on Map
              </Link>
            </div>
            
            <div className="card-static">
              <div className="text-sm font-medium text-[var(--foreground-muted)] mb-2">PREMIUM</div>
              <div className="text-3xl font-bold mb-4">€1M+</div>
              <div className="space-y-3 text-[var(--foreground-secondary)]">
                <p>✓ {over1m.length.toLocaleString()} luxury properties</p>
                <p>✓ Mostly Ballsbridge, Ranelagh, Dalkey</p>
                <p>✓ 4+ beds, 150m²+ typical</p>
              </div>
              <Link href="/map" className="btn-secondary mt-6 w-full text-center block">
                View on Map
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Value Deals */}
      {deals.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">Recent Good Deals</h2>
                <p className="text-[var(--foreground-secondary)]">Properties that sold 15%+ below area average €/sqm</p>
              </div>
              <Link href="/map" className="text-[var(--accent)] hover:underline">
                View on map →
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deals.map((property, i) => {
                const area = areaStats.find(a => property.address.includes(a.name));
                const discount = area?.avgPricePerSqm && property.pricePerSqm 
                  ? Math.round((1 - property.pricePerSqm / area.avgPricePerSqm) * 100)
                  : 0;
                
                return (
                  <div key={i} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <span className="positive-bg text-xs">
                        {discount}% below avg
                      </span>
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {new Date(property.soldDate).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                      {property.address}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xl font-bold font-mono">
                        {formatFullPrice(property.soldPrice)}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--foreground-secondary)]">
                      {property.beds && `${property.beds} bed`}
                      {property.baths && ` · ${property.baths} bath`}
                      {property.areaSqm && ` · ${property.areaSqm}m²`}
                    </div>
                    {property.pricePerSqm && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs">
                        <span className="text-[var(--positive)] font-medium">
                          €{property.pricePerSqm.toLocaleString()}/sqm
                        </span>
                        <span className="text-[var(--foreground-muted)]">
                          {' '}(area avg: €{area?.avgPricePerSqm.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      
      {/* Area Rankings */}
      <section className="py-16 px-4 bg-[var(--background-secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Area Price Guide</h2>
              <p className="text-[var(--foreground-secondary)]">Compare median prices across Dublin</p>
            </div>
            <Link href="/map" className="btn-secondary">
              View on Map
            </Link>
          </div>
          
          <div className="card-static overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[var(--foreground-muted)] text-sm border-b border-[var(--border)]">
                  <th className="p-4 font-medium">Area</th>
                  <th className="p-4 font-medium text-right">Median Price</th>
                  <th className="p-4 font-medium text-right hidden md:table-cell">€/sqm</th>
                  <th className="p-4 font-medium text-right hidden md:table-cell">6mo Change</th>
                  <th className="p-4 font-medium text-right">Sales</th>
                </tr>
              </thead>
              <tbody>
                {areaStats.slice(0, 12).map((area, i) => (
                  <tr key={area.name} className="table-row">
                    <td className="p-4">
                      <span className="font-medium">{area.name}</span>
                    </td>
                    <td className="p-4 text-right font-mono font-medium">
                      {formatFullPrice(area.medianPrice)}
                    </td>
                    <td className="p-4 text-right font-mono text-[var(--foreground-secondary)] hidden md:table-cell">
                      €{area.avgPricePerSqm.toLocaleString()}
                    </td>
                    <td className={`p-4 text-right font-mono hidden md:table-cell ${area.change6m >= 0 ? 'positive' : 'negative'}`}>
                      {area.change6m >= 0 ? '+' : ''}{area.change6m}%
                    </td>
                    <td className="p-4 text-right text-[var(--foreground-secondary)]">
                      {area.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Property?</h2>
          <p className="text-[var(--foreground-secondary)] mb-8">
            Explore the interactive map to see prices across Dublin 
            with {stats.totalProperties.toLocaleString()} sold properties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/map" className="btn-primary">
              Open Interactive Map
            </Link>
            <Link href="/insights" className="btn-secondary">
              View Market Insights
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[var(--foreground-muted)] text-sm">
            Data from public records · Updated daily · {stats.totalProperties.toLocaleString()} properties
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/map" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">Map</Link>
            <Link href="/insights" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">Insights</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

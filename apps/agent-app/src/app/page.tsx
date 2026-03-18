'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, TrendingUp, BarChart3, MapPin, Download, Zap, Shield } from 'lucide-react';

function HomeContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--foreground-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ borderBottom: `1px solid var(--border)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              G
            </div>
            <h1 className="text-xl font-bold">Gaff Intel</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-medium transition"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center mb-12 animate-in">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Instant Property Intelligence for Estate Agents
          </h1>
          <p className="text-xl" style={{ color: 'var(--foreground-secondary)' }}>
            Get professional valuations, comparable analysis, and market reports in seconds.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => router.push('/login')}
              className="btn-primary px-8 py-4"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => router.push('/login')}
              className="btn-secondary px-8 py-4"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>47,000+</p>
            <p style={{ color: 'var(--foreground-secondary)' }}>Sold properties analyzed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--positive)' }}>15+ Areas</p>
            <p style={{ color: 'var(--foreground-secondary)' }}>Full market coverage</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>2.5K+ Users</p>
            <p style={{ color: 'var(--foreground-secondary)' }}>Active agents trust us</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Estate Agents Love Gaff Intel</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Feature 1 */}
          <div className="card animate-in animate-delay-1">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                <Zap className="text-[var(--accent)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">30-Second Valuations</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Enter any Dublin address and get instant comparable sales with deal scores.
                </p>
                <div className="mt-4 inline-block px-3 py-1 rounded-lg" style={{ background: 'var(--positive-bg)', color: 'var(--positive)', fontSize: '0.75rem', fontWeight: '500' }}>
                  Available Now
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="card animate-in animate-delay-2">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                <Download className="text-[var(--accent)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">Branded PDF Reports</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Download professional reports to send to clients and vendors. Impress with data.
                </p>
                <div className="mt-4 inline-block px-3 py-1 rounded-lg" style={{ background: 'var(--positive-bg)', color: 'var(--positive)', fontSize: '0.75rem', fontWeight: '500' }}>
                  Launch Feature
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="card animate-in animate-delay-3">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--warning-bg)' }}>
                <BarChart3 className="text-[var(--warning)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">Market Analytics</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Median prices, trends, and insights on demand. Know the market cold.
                </p>
                <div className="mt-4 inline-block px-3 py-1 rounded-lg" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: '500' }}>
                  Available Now
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="card animate-in animate-delay-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                <MapPin className="text-[var(--accent)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">Geographic Matching</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Smart comparable selection by location, type, and features. No guessing.
                </p>
                <div className="mt-4 inline-block px-3 py-1 rounded-lg" style={{ background: 'var(--positive-bg)', color: 'var(--positive)', fontSize: '0.75rem', fontWeight: '500' }}>
                  Available Now
                </div>
              </div>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="card animate-in animate-delay-2">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                <TrendingUp className="text-[var(--accent)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">Price Trends</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  See how prices are moving month-over-month. Stay ahead of the market.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="card animate-in animate-delay-3">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                <Shield className="text-[var(--accent)]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg">Enterprise Security</h3>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Bank-grade encryption and compliance. Your data is safe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Starter</h3>
            <div className="mb-6">
              <span className="text-3xl font-bold">Free</span>
              <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Forever free tier
              </p>
            </div>
            <ul className="space-y-3 mb-8" style={{ fontSize: '0.875rem' }}>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>5 valuations/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Comparable sales</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Market stats</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/login')}
              className="btn-secondary w-full"
            >
              Get Started
            </button>
          </div>

          {/* Professional Plan */}
          <div className="card relative border-2" style={{ borderColor: 'var(--accent)' }}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-lg text-sm font-bold" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              Most Popular
            </div>
            <h3 className="text-xl font-bold mb-4">Professional</h3>
            <div className="mb-6">
              <span className="text-3xl font-bold">€49</span>
              <span style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem' }}>/month</span>
              <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Billed monthly
              </p>
            </div>
            <ul className="space-y-3 mb-8" style={{ fontSize: '0.875rem' }}>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>25 valuations/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>PDF report export</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Saved searches</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Priority support</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full"
            >
              Start Free Trial
            </button>
          </div>

          {/* Team Plan */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Team</h3>
            <div className="mb-6">
              <span className="text-3xl font-bold">€99</span>
              <span style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem' }}>/month</span>
              <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Up to 5 team members
              </p>
            </div>
            <ul className="space-y-3 mb-8" style={{ fontSize: '0.875rem' }}>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>250 valuations/month</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Team dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>Branded reports</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: 'var(--positive)' }} />
                <span>API access</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/login')}
              className="btn-secondary w-full"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="card text-center py-12" style={{ background: 'var(--gradient-surface)' }}>
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Valuations?</h2>
          <p style={{ color: 'var(--foreground-secondary)', marginBottom: '2rem' }}>
            Join 2,500+ agents who use Gaff Intel. No credit card required to start.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary px-8 py-4"
          >
            Sign Up Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: 'var(--border)', color: 'var(--foreground-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => {
                  const el = document.querySelector('section:nth-of-type(2)');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }} className="hover:text-[var(--accent)] bg-transparent border-none cursor-pointer p-0 text-left" style={{ color: 'inherit' }}>Features</button></li>
                <li><button onClick={() => {
                  const el = document.querySelector('section:nth-of-type(3)');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }} className="hover:text-[var(--accent)] bg-transparent border-none cursor-pointer p-0 text-left" style={{ color: 'inherit' }}>Pricing</button></li>
                <li><span className="text-[var(--foreground-muted)]">API Docs (Coming Soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://irishpropertydata.com/about" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">About</a></li>
                <li><a href="https://irishpropertydata.com/blog" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">Blog</a></li>
                <li><a href="mailto:hello@irishpropertydata.com" className="hover:text-[var(--accent)]">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://irishpropertydata.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">Privacy</a></li>
                <li><a href="https://irishpropertydata.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://twitter.com/gaffintel" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">Twitter</a></li>
                <li><a href="https://linkedin.com/company/gaffintel" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm" style={{ borderColor: 'var(--border)' }}>
            <p>© 2025 Gaff Intel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}

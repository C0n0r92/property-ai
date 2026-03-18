'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';

// Password strength calculation
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Weak', color: 'var(--negative)' };
  if (score <= 4) return { score, label: 'Medium', color: 'var(--warning)' };
  return { score, label: 'Strong', color: 'var(--positive)' };
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Password requirements
  const passwordRequirements = useMemo(() => [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { met: /[a-z]/.test(password), label: 'One lowercase letter' },
    { met: /[0-9]/.test(password), label: 'One number' },
  ], [password]);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up - use same backend as main app
        if (!agencyName.trim()) {
          setError('Agency name is required');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              agency_name: agencyName,
              user_type: 'agent',
            },
          },
        });

        if (error) {
          setError(error.message);
        } else {
          // Account created successfully
          // Since email confirmation is disabled, user can log in immediately
          setError(null);
          setSuccessMessage('Account created successfully. You can now sign in with your credentials.');
          setIsSignUp(false);
          setPassword(''); // Clear password for security
          // Keep email filled so they can log in
        }
      } else {
        // Sign in - use same backend as main app
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Back to home link */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-sm transition"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="card w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
              G
            </div>
            <div>
              <h1 className="text-xl font-bold">Gaff Intel</h1>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>for Estate Agents</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-semibold">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div style={{ background: 'var(--negative-bg)', border: `1px solid var(--negative)`, borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
              <AlertCircle style={{ color: 'var(--negative)', flexShrink: 0, marginTop: '0.125rem' }} size={20} />
              <p style={{ fontSize: '0.875rem', color: 'var(--negative)' }}>{error}</p>
            </div>
          )}

          {successMessage && (
            <div style={{ background: 'var(--positive-bg)', border: `1px solid var(--positive)`, borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
              <Check style={{ color: 'var(--positive)', flexShrink: 0, marginTop: '0.125rem' }} size={20} />
              <p style={{ fontSize: '0.875rem', color: 'var(--positive)' }}>{successMessage}</p>
            </div>
          )}

          {isSignUp && (
            <div>
              <label htmlFor="agency" className="block text-sm font-medium mb-2">
                Agency Name
              </label>
              <input
                id="agency"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                style={{ background: 'var(--surface)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:border-[var(--accent)]"
                placeholder="Your agency name"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: 'var(--surface)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:border-[var(--accent)]"
              placeholder="you@agency.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ background: 'var(--surface)', border: `1px solid var(--border)`, color: 'var(--foreground)' }}
                className="w-full px-4 py-3 pr-12 rounded-lg focus:outline-none focus:border-[var(--accent)]"
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--foreground-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Meter - only show during sign up */}
            {isSignUp && password.length > 0 && (
              <div className="mt-3">
                {/* Strength bar */}
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full"
                      style={{
                        background: level <= passwordStrength.score ? passwordStrength.color : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs mb-2" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </p>

                {/* Requirements checklist */}
                <div className="space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <Check size={12} style={{ color: 'var(--positive)' }} />
                      ) : (
                        <X size={12} style={{ color: 'var(--foreground-muted)' }} />
                      )}
                      <span style={{ color: req.met ? 'var(--positive)' : 'var(--foreground-muted)' }}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccessMessage(null);
              setEmail('');
              setPassword('');
              setAgencyName('');
            }}
            className="text-sm transition"
            style={{ color: 'var(--accent)' }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-8 pt-8" style={{ borderTop: `1px solid var(--border)` }}>
          <p className="text-xs text-center" style={{ color: 'var(--foreground-secondary)' }}>
            Back to consumer app?{' '}
            <a href="https://irishpropertydata.com" style={{ color: 'var(--accent)' }} className="hover:underline">
              Visit main site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

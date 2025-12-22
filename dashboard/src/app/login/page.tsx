'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { SignInButton } from '@/components/auth/SignInButton';

function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/map');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Irish Property Data</h1>
          <p className="text-gray-400">Sign in to access premium features</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <Suspense fallback={<div></div>}>
            <ErrorMessage />
          </Suspense>

          <SignInButton />

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/map')}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  return (
    <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
      <p className="text-red-400 text-sm">
        {error === 'email_confirmation_failed' && 'Email confirmation failed. Please try again.'}
        {error === 'auth_failed' && 'Authentication failed. Please try again.'}
        {error === 'Invalid login credentials' && 'Invalid email or password. Please try again.'}
        {error === 'Email not confirmed' && 'Please check your email and confirm your account before signing in.'}
        {error}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}

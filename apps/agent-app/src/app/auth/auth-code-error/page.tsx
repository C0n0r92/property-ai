'use client';

import { useRouter } from 'next/navigation';

export default function AuthCodeError() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          There was an error confirming your email. This link may have expired.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700"
          >
            Back to Login
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-200 text-gray-900 py-2 px-4 rounded font-medium hover:bg-gray-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { User } from '@/types/supabase';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user with their tier information
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Fetch user data from public.profiles table
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    return null;
  }

  return user as User;
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components or Server Actions
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Require premium tier - redirects to insights upgrade page if not premium
 * Use this in Server Components or Server Actions
 */
export async function requirePremium(): Promise<User> {
  const user = await requireAuth();

  if (user.tier !== 'premium') {
    redirect('/insights?upgrade=true');
  }

  return user;
}

/**
 * Check if user has premium tier
 */
export async function isPremiumUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.tier === 'premium';
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}


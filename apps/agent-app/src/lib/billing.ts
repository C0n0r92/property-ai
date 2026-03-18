import { supabase } from './supabase';

export interface UserPlan {
  tier: 'starter' | 'professional' | 'agency' | 'free';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  monthlySearchLimit: number;
  searchesUsedThisMonth: number;
  canExportPDF: boolean;
  canSaveSearches: boolean;
  teamSeats: number;
}

export const PLANS: Record<string, UserPlan> = {
  free: {
    tier: 'free',
    status: 'active',
    monthlySearchLimit: 5,
    searchesUsedThisMonth: 0,
    canExportPDF: false,
    canSaveSearches: false,
    teamSeats: 1,
  },
  starter: {
    tier: 'starter',
    status: 'active',
    monthlySearchLimit: 25,
    searchesUsedThisMonth: 0,
    canExportPDF: true,
    canSaveSearches: false,
    teamSeats: 1,
  },
  professional: {
    tier: 'professional',
    status: 'active',
    monthlySearchLimit: 250,
    searchesUsedThisMonth: 0,
    canExportPDF: true,
    canSaveSearches: true,
    teamSeats: 3,
  },
  agency: {
    tier: 'agency',
    status: 'active',
    monthlySearchLimit: 1000,
    searchesUsedThisMonth: 0,
    canExportPDF: true,
    canSaveSearches: true,
    teamSeats: 10,
  },
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    // Fetch from profiles table (created on user signup)
    // Note: searches_this_month and last_search_reset columns may not exist yet
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tier, subscription_status, stripe_customer_id, stripe_subscription_id, searches_this_month, last_search_reset')
      .eq('id', userId)
      .single();

    if (error) {
      // If the error is about missing columns, try without them
      if (error.message?.includes('column') || error.code === 'PGRST116') {
        const { data: basicProfile } = await supabase
          .from('profiles')
          .select('tier, subscription_status, stripe_customer_id, stripe_subscription_id')
          .eq('id', userId)
          .single();

        if (basicProfile) {
          const tier = basicProfile.tier || 'free';
          const plan = PLANS[tier] || PLANS.free;
          return {
            ...plan,
            status: basicProfile.subscription_status || 'active',
            stripeCustomerId: basicProfile.stripe_customer_id,
            stripeSubscriptionId: basicProfile.stripe_subscription_id,
            searchesUsedThisMonth: 0,
          };
        }
      }
      // Default to free plan if no profile found
      return PLANS.free;
    }

    if (!profile) {
      return PLANS.free;
    }

    // Check if we need to reset monthly count (start of new month)
    let searchesUsed = profile.searches_this_month || 0;
    const lastReset = profile.last_search_reset ? new Date(profile.last_search_reset) : null;
    const now = new Date();

    if (!lastReset || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      // Reset the counter for new month (silently fail if columns don't exist)
      searchesUsed = 0;
      try {
        await supabase
          .from('profiles')
          .update({
            searches_this_month: 0,
            last_search_reset: now.toISOString(),
          })
          .eq('id', userId);
      } catch {
        // Ignore errors if columns don't exist
      }
    }

    // Map tier to plan
    const tier = profile.tier || 'free';
    const plan = PLANS[tier] || PLANS.free;

    return {
      ...plan,
      status: profile.subscription_status || 'active',
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id,
      searchesUsedThisMonth: searchesUsed,
    };
  } catch (error) {
    console.error('Error fetching user plan:', error);
    return PLANS.free;
  }
}

export async function incrementSearchCount(userId: string): Promise<boolean> {
  try {
    // Increment the search count in profiles table
    const { error } = await supabase.rpc('increment_search_count', { user_id: userId });

    // If RPC doesn't exist, fallback to direct update
    if (error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('searches_this_month')
        .eq('id', userId)
        .single();

      const currentCount = profile?.searches_this_month || 0;

      await supabase
        .from('profiles')
        .update({ searches_this_month: currentCount + 1 })
        .eq('id', userId);
    }

    return true;
  } catch (err) {
    console.error('Error incrementing search count:', err);
    return true; // Allow search even if tracking fails
  }
}

export async function canPerformSearch(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const plan = await getUserPlan(userId);

  if (plan.searchesUsedThisMonth >= plan.monthlySearchLimit) {
    return {
      allowed: false,
      message: `You have reached your monthly search limit of ${plan.monthlySearchLimit}. Upgrade your plan to continue.`,
    };
  }

  return { allowed: true };
}

export async function resetMonthlyUsage(): Promise<void> {
  try {
    // TODO: Implement monthly usage reset when search count tracking is added
    // For now, this is a placeholder
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
  }
}

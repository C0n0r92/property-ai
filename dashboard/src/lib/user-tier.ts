import { createClient } from '@/lib/supabase/server';
import { logSubscriptionCreated, logSubscriptionCancelled, logSubscriptionUpdated } from '@/lib/logger';

/**
 * Upgrade a user to premium tier
 */
export async function upgradeToPremium(
  userId: string,
  stripeData: {
    customerId: string;
    subscriptionId: string;
    plan: string;
    amount: number;
  }
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({
        tier: 'premium',
        stripe_customer_id: stripeData.customerId,
        stripe_subscription_id: stripeData.subscriptionId,
        subscription_status: 'active',
      })
      .eq('id', userId);

    if (error) {
      console.error('Error upgrading user to premium:', error);
      return false;
    }

    // Log the subscription creation
    await logSubscriptionCreated(userId, stripeData);

    return true;
  } catch (error) {
    console.error('Failed to upgrade user to premium:', error);
    return false;
  }
}

/**
 * Downgrade a user to free tier
 */
export async function downgradeToFree(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get subscription ID before downgrading
    const { data: user } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('profiles')
      .update({
        tier: 'free',
        subscription_status: 'cancelled',
      })
      .eq('id', userId);

    if (error) {
      console.error('Error downgrading user to free:', error);
      return false;
    }

    // Log the subscription cancellation
    if (user?.stripe_subscription_id) {
      await logSubscriptionCancelled(userId, user.stripe_subscription_id);
    }

    return true;
  } catch (error) {
    console.error('Failed to downgrade user to free:', error);
    return false;
  }
}

/**
 * Sync Stripe subscription status
 */
export async function syncStripeSubscription(
  userId: string,
  subscriptionId: string,
  status: string | null
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: status,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error syncing subscription status:', error);
      return false;
    }

    // Log the subscription update
    await logSubscriptionUpdated(userId, subscriptionId, status || 'unknown');

    return true;
  } catch (error) {
    console.error('Failed to sync subscription status:', error);
    return false;
  }
}

/**
 * Get user by email (for Stripe webhook processing)
 */
export async function getUserByEmail(email: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !data) {
      console.error('Error getting user by email:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    return null;
  }
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(customerId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !data) {
      console.error('Error getting user by Stripe customer ID:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Failed to get user by Stripe customer ID:', error);
    return null;
  }
}


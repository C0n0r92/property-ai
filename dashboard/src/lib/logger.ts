import { createClient } from '@/lib/supabase/server';
import { EventType } from '@/types/supabase';

/**
 * Log an event to the user_events table
 * This function requires service role access and should only be called from server-side code
 */
export async function logEvent(
  eventType: EventType,
  userId: string | null,
  eventData?: any
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('user_events')
      .insert({
        event_type: eventType,
        user_id: userId,
        event_data: eventData || {},
      });

    if (error) {
      console.error('Error logging event:', error);
    }
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

/**
 * Log user signup event
 */
export async function logUserSignup(userId: string, email: string): Promise<void> {
  await logEvent('user_signup', userId, { email });
}

/**
 * Log user login event
 */
export async function logUserLogin(userId: string, email: string): Promise<void> {
  await logEvent('user_login', userId, { email });
}

/**
 * Log subscription created event
 */
export async function logSubscriptionCreated(
  userId: string,
  stripeData: {
    customerId: string;
    subscriptionId: string;
    plan: string;
    amount: number;
  }
): Promise<void> {
  await logEvent('subscription_created', userId, stripeData);
}

/**
 * Log subscription cancelled event
 */
export async function logSubscriptionCancelled(
  userId: string,
  subscriptionId: string
): Promise<void> {
  await logEvent('subscription_cancelled', userId, { subscriptionId });
}

/**
 * Log subscription updated event
 */
export async function logSubscriptionUpdated(
  userId: string,
  subscriptionId: string,
  status: string
): Promise<void> {
  await logEvent('subscription_updated', userId, { subscriptionId, status });
}

/**
 * Log property saved event
 */
export async function logPropertySaved(
  userId: string,
  propertyId: string,
  propertyType: 'listing' | 'rental'
): Promise<void> {
  await logEvent('property_saved', userId, { propertyId, propertyType });
}

/**
 * Log property unsaved event
 */
export async function logPropertyUnsaved(
  userId: string,
  propertyId: string,
  propertyType: 'listing' | 'rental'
): Promise<void> {
  await logEvent('property_unsaved', userId, { propertyId, propertyType });
}


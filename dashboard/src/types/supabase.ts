export type UserTier = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: UserTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  property_type: 'listing' | 'rental' | 'sold';
  property_data: any; // This will contain the full property object
  notes: string | null;
  metadata?: {
    saved_from?: string;
    user_agent?: string;
    saved_at?: string;
    view_count?: number;
    last_viewed?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UserEvent {
  id: string;
  user_id: string | null;
  event_type: EventType;
  event_data: any;
  created_at: string;
}

export type EventType =
  | 'user_signup'
  | 'user_login'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'subscription_updated'
  | 'property_saved'
  | 'property_unsaved';


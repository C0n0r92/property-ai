import { supabase } from './supabase';

export interface SavedProperty {
  id: string;
  user_id: string;
  address: string;
  beds?: number;
  baths?: number;
  area_sqm?: number;
  property_type?: string;
  price?: number;
  notes?: string;
  property_data?: Record<string, unknown>;
  saved_at: string;
  last_valuation?: {
    medianPrice: number;
    verdict: string;
  };
}

export interface SavePropertyInput {
  address: string;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  price?: number;
  notes?: string;
  propertyData?: Record<string, unknown>;
  lastValuation?: {
    medianPrice: number;
    verdict: string;
  };
}

/**
 * Save a property for the current user
 */
export async function saveProperty(
  userId: string,
  property: SavePropertyInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Check if property already saved
    const { data: existing } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('address', property.address)
      .single();

    if (existing) {
      // Update existing entry
      const { error } = await supabase
        .from('saved_properties')
        .update({
          beds: property.beds,
          baths: property.baths,
          area_sqm: property.areaSqm,
          property_type: property.propertyType,
          price: property.price,
          notes: property.notes,
          property_data: property.propertyData,
          last_valuation: property.lastValuation,
          saved_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
      return { success: true, id: existing.id };
    }

    // Insert new entry
    const { data, error } = await supabase
      .from('saved_properties')
      .insert({
        user_id: userId,
        address: property.address,
        beds: property.beds,
        baths: property.baths,
        area_sqm: property.areaSqm,
        property_type: property.propertyType,
        price: property.price,
        notes: property.notes,
        property_data: property.propertyData,
        last_valuation: property.lastValuation,
        saved_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error saving property:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save property',
    };
  }
}

/**
 * Get all saved properties for a user
 */
export async function getSavedProperties(userId: string): Promise<SavedProperty[]> {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved properties:', error);
    return [];
  }
}

/**
 * Delete a saved property
 */
export async function deleteSavedProperty(
  userId: string,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('id', propertyId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting saved property:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete property',
    };
  }
}

/**
 * Update notes for a saved property
 */
export async function updatePropertyNotes(
  userId: string,
  propertyId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_properties')
      .update({ notes })
      .eq('id', propertyId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating property notes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notes',
    };
  }
}

/**
 * Get count of saved properties for a user
 */
export async function getSavedPropertiesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('saved_properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting saved properties:', error);
    return 0;
  }
}

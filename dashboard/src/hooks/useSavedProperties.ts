'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedProperty } from '@/types/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export function useSavedProperties() {
  const { user } = useAuth();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved properties
  const fetchSavedProperties = useCallback(async () => {
    if (!user) {
      setSavedProperties([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/saved-properties');
      
      if (!response.ok) {
        throw new Error('Failed to fetch saved properties');
      }

      const data = await response.json();
      setSavedProperties(data.properties || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching saved properties:', err);
      setError('Failed to load saved properties');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load saved properties on mount
  useEffect(() => {
    fetchSavedProperties();
  }, [fetchSavedProperties]);

  // Check if a property is saved
  const isSaved = useCallback((propertyId: string, propertyType: 'listing' | 'rental'): boolean => {
    return savedProperties.some(
      (sp) => sp.property_id === propertyId && sp.property_type === propertyType
    );
  }, [savedProperties]);

  // Save a property
  const saveProperty = useCallback(async (
    propertyId: string,
    propertyType: 'listing' | 'rental',
    propertyData: any,
    notes?: string
  ): Promise<{ success: boolean; requiresUpgrade?: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please sign in to save properties' };
    }

    try {
      // Optimistic update
      const optimisticProperty: SavedProperty = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        property_id: propertyId,
        property_type: propertyType,
        property_data: propertyData,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSavedProperties((prev) => [optimisticProperty, ...prev]);

      const response = await fetch('/api/saved-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          property_type: propertyType,
          property_data: propertyData,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update
        setSavedProperties((prev) => prev.filter((sp) => sp.id !== optimisticProperty.id));

        if (response.status === 403 && data.requiresUpgrade) {
          return { success: false, requiresUpgrade: true };
        }

        return { success: false, error: data.error || 'Failed to save property' };
      }

      // Replace optimistic property with real data
      setSavedProperties((prev) =>
        prev.map((sp) => (sp.id === optimisticProperty.id ? data.property : sp))
      );

      return { success: true };
    } catch (err) {
      console.error('Error saving property:', err);
      // Revert optimistic update
      await fetchSavedProperties();
      return { success: false, error: 'Failed to save property' };
    }
  }, [user, fetchSavedProperties]);

  // Unsave a property
  const unsaveProperty = useCallback(async (
    propertyId: string,
    propertyType: 'listing' | 'rental'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Optimistic update
      const previousProperties = [...savedProperties];
      setSavedProperties((prev) =>
        prev.filter((sp) => !(sp.property_id === propertyId && sp.property_type === propertyType))
      );

      const response = await fetch(
        `/api/saved-properties?property_id=${propertyId}&property_type=${propertyType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        // Revert optimistic update
        setSavedProperties(previousProperties);
        return { success: false, error: 'Failed to unsave property' };
      }

      return { success: true };
    } catch (err) {
      console.error('Error unsaving property:', err);
      // Revert optimistic update
      await fetchSavedProperties();
      return { success: false, error: 'Failed to unsave property' };
    }
  }, [user, savedProperties, fetchSavedProperties]);

  return {
    savedProperties,
    loading,
    error,
    isSaved,
    saveProperty,
    unsaveProperty,
    refetch: fetchSavedProperties,
  };
}


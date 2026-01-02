import { useState, useRef } from 'react';
import type { Property, Listing, RentalListing } from '@/types/property';

// Custom hook for managing map data state
export const useMapData = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rentals, setRentals] = useState<RentalListing[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // 0-100 percentage
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedRental, setSelectedRental] = useState<RentalListing | null>(null);

  const isClosingRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Function to clear all selections
  const clearSelections = () => {
    setSelectedProperty(null);
    setSelectedListing(null);
    setSelectedRental(null);
  };

  // Function to get the currently selected item (property, listing, or rental)
  const getSelectedItem = () => {
    return selectedProperty || selectedListing || selectedRental;
  };

  return {
    // Data
    properties,
    setProperties,
    listings,
    setListings,
    rentals,
    setRentals,

    // Loading state
    loading,
    setLoading,
    loadingProgress,
    setLoadingProgress,

    // Selection state
    selectedProperty,
    setSelectedProperty,
    selectedListing,
    setSelectedListing,
    selectedRental,
    setSelectedRental,

    // Refs
    isClosingRef,
    isLoadingRef,

    // Helper functions
    clearSelections,
    getSelectedItem,
  };
};

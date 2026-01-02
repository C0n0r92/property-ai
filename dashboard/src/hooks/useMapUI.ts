import { useState } from 'react';

// Custom hook for managing UI state
export const useMapUI = () => {
  // Collapsible filter panel state - hidden by default on all devices
  const [showFilters, setShowFilters] = useState(() => {
    return false; // Default to false for all devices
  });

  // Mobile-specific states
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'planning'>('overview');
  const [isMobileAmenitiesMode, setIsMobileAmenitiesMode] = useState(false);

  // Collapsible sections state (Overview tab only)
  const [expandedSections, setExpandedSections] = useState({
    additionalDetails: false,
  });

  // Tooltip state
  const [showFiltersTooltip, setShowFiltersTooltip] = useState(false);

  return {
    showFilters,
    setShowFilters,
    activeTab,
    setActiveTab,
    isMobileAmenitiesMode,
    setIsMobileAmenitiesMode,
    expandedSections,
    setExpandedSections,
    showFiltersTooltip,
    setShowFiltersTooltip,
  };
};

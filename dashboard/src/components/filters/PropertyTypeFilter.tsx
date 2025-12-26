import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface PropertyTypeOption {
  name: string;
  count: number;
  popular?: boolean;
}

interface PropertyTypeCategory {
  category: string;
  icon: string;
  count: number;
  subtypes: PropertyTypeOption[];
}

interface PropertyTypeFilterProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
  showCounts?: boolean;
  smartPresets?: boolean;
  className?: string;
}

const PROPERTY_TYPE_HIERARCHY: PropertyTypeCategory[] = [
  {
    category: 'Houses',
    icon: 'house',
    count: 0,
    subtypes: [
      { name: 'Detached House', count: 0, popular: true },
      { name: 'Semi-Detached House', count: 0, popular: true },
      { name: 'Terraced House', count: 0, popular: true },
      { name: 'End of Terrace House', count: 0 },
      { name: 'Townhouse', count: 0 },
      { name: 'Bungalow', count: 0 },
    ]
  },
  {
    category: 'Apartments',
    icon: '🏢',
    count: 0,
    subtypes: [
      { name: 'Apartment', count: 0, popular: true },
      { name: 'Penthouse', count: 0 },
      { name: 'Studio', count: 0 },
      { name: 'Duplex', count: 0 },
    ]
  },
  {
    category: 'Other',
    icon: '🏗️',
    count: 0,
    subtypes: [
      { name: 'Site', count: 0 },
    ]
  }
];

const SMART_PRESETS = [
  {
    name: 'Family Homes',
    description: 'Detached, semi-detached, and terraced houses',
    types: ['Detached', 'Semi-D', 'Terraced', 'Townhouse']
  },
  {
    name: 'City Apartments',
    description: 'Apartments and studios in urban areas',
    types: ['Apartment', 'Studio']
  },
  {
    name: 'Commuter Properties',
    description: 'Popular property types for commuters',
    types: ['Apartment', 'Detached', 'Semi-D']
  },
  {
    name: 'Investment Properties',
    description: 'Common rental property types',
    types: ['Apartment', 'Terraced', 'Townhouse']
  },
  {
    name: 'Affordable Housing',
    description: 'Budget-friendly apartments and houses',
    types: ['Apartment', 'Terraced', 'Townhouse']
  },
  {
    name: 'Luxury Properties',
    description: 'Premium detached and semi-detached homes',
    types: ['Detached', 'Semi-D']
  }
];

export function PropertyTypeFilter({
  selectedTypes,
  onTypeChange,
  showCounts = true,
  smartPresets = true,
  className = ''
}: PropertyTypeFilterProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hierarchyData, setHierarchyData] = useState<PropertyTypeCategory[]>(PROPERTY_TYPE_HIERARCHY);

  // Update counts based on available properties (this would come from props in real implementation)
  useEffect(() => {
    // This would be replaced with actual property data
    const mockCounts = {
      'Detached House': 847,
      'Semi-Detached House': 1203,
      'Terraced House': 756,
      'End of Terrace House': 341,
      'Townhouse': 100,
      'Bungalow': 89,
      'Apartment': 2456,
      'Penthouse': 234,
      'Studio': 123,
      'Duplex': 78,
      'Site': 67
    };

    const updatedHierarchy = PROPERTY_TYPE_HIERARCHY.map(category => ({
      ...category,
      count: category.subtypes.reduce((sum, subtype) => sum + (mockCounts[subtype.name as keyof typeof mockCounts] || 0), 0),
      subtypes: category.subtypes.map(subtype => ({
        ...subtype,
        count: mockCounts[subtype.name as keyof typeof mockCounts] || 0
      }))
    }));

    setHierarchyData(updatedHierarchy);
  }, []);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleType = (typeName: string) => {
    if (selectedTypes.includes(typeName)) {
      onTypeChange(selectedTypes.filter(t => t !== typeName));
    } else {
      onTypeChange([...selectedTypes, typeName]);
    }
  };

  const applyPreset = (preset: typeof SMART_PRESETS[0]) => {
    onTypeChange(preset.types);
  };

  const isCategoryFullySelected = (category: PropertyTypeCategory) => {
    return category.subtypes.every(subtype => selectedTypes.includes(subtype.name));
  };

  const isCategoryPartiallySelected = (category: PropertyTypeCategory) => {
    return category.subtypes.some(subtype => selectedTypes.includes(subtype.name)) &&
           !isCategoryFullySelected(category);
  };

  const toggleCategorySelection = (category: PropertyTypeCategory) => {
    if (isCategoryFullySelected(category)) {
      // Remove all subtypes
      const newSelected = selectedTypes.filter(type => !category.subtypes.some(subtype => subtype.name === type));
      onTypeChange(newSelected);
    } else {
      // Add all subtypes
      const newSelected = [...selectedTypes];
      category.subtypes.forEach(subtype => {
        if (!newSelected.includes(subtype.name)) {
          newSelected.push(subtype.name);
        }
      });
      onTypeChange(newSelected);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Smart Presets */}
      {smartPresets && (
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
            Quick Filters
          </label>
          <div className="text-xs text-gray-400 mb-3">
            Combine with distance filters below for location-based search
          </div>
          <div className="space-y-2">
            {SMART_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-300 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property Type Hierarchy */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
          Property Types {showCounts && selectedTypes.length > 0 && (
            <span className="text-blue-400 ml-2">({selectedTypes.length} selected)</span>
          )}
        </label>
        <div className="space-y-1">
          {hierarchyData.map(category => {
            const isExpanded = expandedCategories.has(category.category);
            const isFullySelected = isCategoryFullySelected(category);
            const isPartiallySelected = isCategoryPartiallySelected(category);

            return (
              <div key={category.category} className="border border-gray-700 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{category.icon}</span>
                    <span className="text-sm font-medium text-white">{category.category}</span>
                    {showCounts && (
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                        {category.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Category selection checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategorySelection(category);
                      }}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        isFullySelected
                          ? 'bg-blue-600 border-blue-600'
                          : isPartiallySelected
                          ? 'bg-blue-400 border-blue-400'
                          : 'border-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {isFullySelected && <Check className="w-3 h-3 text-white" />}
                      {isPartiallySelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Subtypes */}
                {isExpanded && (
                  <div className="bg-gray-900 border-t border-gray-700">
                    {category.subtypes.map(subtype => {
                      const isSelected = selectedTypes.includes(subtype.name);
                      return (
                        <button
                          key={subtype.name}
                          onClick={() => toggleType(subtype.name)}
                          className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">{subtype.name}</span>
                            {subtype.popular && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {showCounts && (
                              <span className="text-xs text-gray-500">
                                {subtype.count.toLocaleString()}
                              </span>
                            )}
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-500 hover:border-gray-400'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear Selection */}
      {selectedTypes.length > 0 && (
        <button
          onClick={() => onTypeChange([])}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
        >
          Clear All Selections
        </button>
      )}
    </div>
  );
}

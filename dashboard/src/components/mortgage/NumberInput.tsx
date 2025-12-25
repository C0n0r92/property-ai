/**
 * NumberInput Component
 *
 * Formatted number input with currency support and dark theme styling.
 * Adapted from original mortgage calculator with property-ml design tokens.
 */

import React, { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/mortgage/formatters';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  prefix,
  suffix,
  min,
  max,
  step,
  error
}) => {
  const [displayValue, setDisplayValue] = useState(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse the formatted number (remove commas)
    const numericValue = parseInt(inputValue.replace(/,/g, '')) || 0;

    if (!isNaN(numericValue)) {
      if (min !== undefined && numericValue < min) return;
      if (max !== undefined && numericValue > max) return;
      onChange(numericValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatNumber(value));
  };

  return (
    <div className="relative group">
      {prefix && (
        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--foreground-secondary)] font-medium z-10">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full ${prefix ? 'pl-12' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'} py-3
                   bg-[var(--background)] border-2 border-[var(--border)]
                   hover:border-blue-400 rounded-xl
                   focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                   transition-all duration-200 ease-out
                   text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)]
                   hover:shadow-md focus:shadow-lg
                   ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                   ${isFocused ? 'shadow-lg scale-[1.01]' : ''}
                   ${className}`}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--foreground-secondary)] font-medium z-10">
          {suffix}
        </span>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};


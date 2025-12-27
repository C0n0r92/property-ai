/**
 * Tooltip Component
 *
 * Accessible tooltip with dark theme styling.
 * Supports keyboard navigation and screen readers.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  title?: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  iconClassName?: string;
  maxWidth?: string;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  children,
  position = 'top',
  showIcon = true,
  iconClassName = "w-4 h-4 text-[var(--foreground-secondary)] hover:text-blue-400 cursor-help ml-1 transition-colors",
  maxWidth = "max-w-lg",
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipId] = useState(() => `tooltip-${Math.random().toString(36).substr(2, 9)}`);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--surface)]',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--surface)]',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--surface)]',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--surface)]'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div
        className="inline-flex items-center"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-expanded={isVisible}
        aria-label={title || "Show information"}
      >
        {children}
        {showIcon && (
          <Info className={iconClassName} />
        )}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 ${positionClasses[position]} ${maxWidth} p-4
                     bg-[var(--surface)] border border-[var(--border)]
                     text-[var(--foreground)] text-sm rounded-lg shadow-xl
                     min-w-0 animate-in fade-in-0 zoom-in-95`}
        >
          {title && (
            <div className="font-semibold text-blue-400 mb-2 text-xs uppercase tracking-wide border-b border-[var(--border)] pb-1">
              {title}
            </div>
          )}
          <div className="leading-relaxed whitespace-pre-line">
            {content}
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};

// Specialized component for form field labels
export const LabelWithTooltip: React.FC<{
  label: string;
  tooltip: string;
  title?: string;
  required?: boolean;
  className?: string;
}> = ({
  label,
  tooltip,
  title,
  required = false,
  className = "block text-sm font-medium text-[var(--foreground)] mb-2"
}) => {
  return (
    <label className={className}>
      <span className="flex items-center">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        <Tooltip content={tooltip} title={title} />
      </span>
    </label>
  );
};




